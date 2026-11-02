#include "flutter_window.h"

#include <optional>
#include <string>
#include <vector>

#include "flutter/generated_plugin_registrant.h"
#include "jump_list_manager.h"

namespace {
HHOOK g_keyboard_hook = nullptr;
bool g_kiosk_lockdown_active = false;

LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode == HC_ACTION && g_kiosk_lockdown_active) {
    const auto* p = reinterpret_cast<KBDLLHOOKSTRUCT*>(lParam);
    if (p != nullptr) {
      const DWORD vk = p->vkCode;
      const bool alt_down = (p->flags & LLKHF_ALTDOWN) != 0 ||
                            (GetAsyncKeyState(VK_MENU) & 0x8000) != 0;
      const bool ctrl_down = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
      const bool shift_down = (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0;

      // 1. Block Left & Right Windows Keys (Start Menu, Win+D, Win+E, Win+R, Win+Tab, Win+X, etc.)
      if (vk == VK_LWIN || vk == VK_RWIN || vk == VK_APPS) {
        return 1;
      }
      // 2. Block Alt+Tab, Alt+Esc, Alt+F4, Alt+Space
      if (alt_down && (vk == VK_TAB || vk == VK_ESCAPE || vk == VK_F4 || vk == VK_SPACE)) {
        return 1;
      }
      // 3. Block Ctrl+Esc (Start Menu) and Ctrl+Shift+Esc (Task Manager)
      if (ctrl_down && vk == VK_ESCAPE) {
        return 1;
      }
      if (ctrl_down && shift_down && vk == VK_ESCAPE) {
        return 1;
      }
      // 4. Block F11 (Fullscreen toggle escape)
      if (vk == VK_F11) {
        return 1;
      }
    }
  }
  return CallNextHookEx(g_keyboard_hook, nCode, wParam, lParam);
}

void SetWindowsKeyboardLockdown(HWND hwnd, bool enable, bool force_topmost) {
  g_kiosk_lockdown_active = enable;
  if (enable) {
    if (g_keyboard_hook == nullptr) {
      g_keyboard_hook = SetWindowsHookExW(
          WH_KEYBOARD_LL, LowLevelKeyboardProc, GetModuleHandle(nullptr), 0);
    }
    if (hwnd != nullptr) {
      ShowWindow(hwnd, SW_RESTORE);
      SetWindowPos(hwnd, force_topmost ? HWND_TOPMOST : HWND_NOTOPMOST, 0, 0, 0, 0,
                   SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
      SetForegroundWindow(hwnd);
    }
  } else {
    if (g_keyboard_hook != nullptr) {
      UnhookWindowsHookEx(g_keyboard_hook);
      g_keyboard_hook = nullptr;
    }
    if (hwnd != nullptr) {
      SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0,
                   SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
    }
  }
}

int GetWindowsSystemIdleSeconds() {
  LASTINPUTINFO lii{};
  lii.cbSize = sizeof(LASTINPUTINFO);
  if (GetLastInputInfo(&lii)) {
    DWORD now = GetTickCount();
    DWORD elapsed_ms = (now >= lii.dwTime) ? (now - lii.dwTime) : 0;
    return static_cast<int>(elapsed_ms / 1000);
  }
  return 0;
}
}  // namespace

FlutterWindow::FlutterWindow(const flutter::DartProject& project)
    : project_(project) {}

FlutterWindow::~FlutterWindow() {}

bool FlutterWindow::OnCreate() {
  if (!Win32Window::OnCreate()) {
    return false;
  }

  RECT frame = GetClientArea();

  // The size here must match the window dimensions to avoid unnecessary surface
  // creation / destruction in the startup path.
  flutter_controller_ = std::make_unique<flutter::FlutterViewController>(
      frame.right - frame.left, frame.bottom - frame.top, project_);
  // Ensure that basic setup of the controller was successful.
  if (!flutter_controller_->engine() || !flutter_controller_->view()) {
    return false;
  }
  RegisterPlugins(flutter_controller_->engine());
  SetChildContent(flutter_controller_->view()->GetNativeWindow());

  // Initialize Taskbar Jump List MethodChannel
  jump_list_channel_ = std::make_unique<flutter::MethodChannel<flutter::EncodableValue>>(
      flutter_controller_->engine()->messenger(),
      "com.ozikol.bcc/jumplist",
      &flutter::StandardMethodCodec::GetInstance());

  jump_list_channel_->SetMethodCallHandler(
      [](const flutter::MethodCall<flutter::EncodableValue>& call,
         std::unique_ptr<flutter::MethodResult<flutter::EncodableValue>> result) {
        if (call.method_name() == "updateRecentWorkspaces") {
          const auto* arguments = std::get_if<flutter::EncodableList>(call.arguments());
          if (arguments) {
            std::vector<JumpListWorkspaceItem> items;
            for (const auto& item_val : *arguments) {
              const auto* item_map = std::get_if<flutter::EncodableMap>(&item_val);
              if (item_map) {
                JumpListWorkspaceItem ws;
                auto it_key = item_map->find(flutter::EncodableValue("tenantKey"));
                if (it_key != item_map->end()) {
                  const auto* val = std::get_if<std::string>(&it_key->second);
                  if (val) ws.tenant_key = *val;
                }
                auto it_name = item_map->find(flutter::EncodableValue("displayName"));
                if (it_name != item_map->end()) {
                  const auto* val = std::get_if<std::string>(&it_name->second);
                  if (val) ws.display_name = *val;
                }
                if (!ws.tenant_key.empty()) {
                  items.push_back(ws);
                }
              }
            }
            bool ok = JumpListManager::UpdateWorkspaces(items);
            result->Success(flutter::EncodableValue(ok));
            return;
          }
          result->Error("INVALID_ARGUMENTS", "Expected list of workspaces");
        } else if (call.method_name() == "clearRecentWorkspaces") {
          bool ok = JumpListManager::Clear();
          result->Success(flutter::EncodableValue(ok));
        } else {
          result->NotImplemented();
        }
      });

  // Initialize Workstation Kiosk Lockdown & OS Idle Detection MethodChannel
  kiosk_channel_ = std::make_unique<flutter::MethodChannel<flutter::EncodableValue>>(
      flutter_controller_->engine()->messenger(),
      "com.ozikol.bcc/kiosk",
      &flutter::StandardMethodCodec::GetInstance());

  HWND self_hwnd = GetHandle();
  kiosk_channel_->SetMethodCallHandler(
      [self_hwnd](const flutter::MethodCall<flutter::EncodableValue>& call,
                  std::unique_ptr<flutter::MethodResult<flutter::EncodableValue>> result) {
        if (call.method_name() == "setLockdownMode") {
          bool enable = false;
          bool topmost = false;
          if (const auto* b = std::get_if<bool>(call.arguments())) {
            enable = *b;
          } else if (const auto* m = std::get_if<flutter::EncodableMap>(call.arguments())) {
            auto it = m->find(flutter::EncodableValue("enabled"));
            if (it != m->end()) {
              if (const auto* bv = std::get_if<bool>(&it->second)) {
                enable = *bv;
              }
            }
            auto it_top = m->find(flutter::EncodableValue("topmost"));
            if (it_top != m->end()) {
              if (const auto* tv = std::get_if<bool>(&it_top->second)) {
                topmost = *tv;
              }
            }
          }
          SetWindowsKeyboardLockdown(self_hwnd, enable, topmost);
          result->Success(flutter::EncodableValue(true));
        } else if (call.method_name() == "getSystemIdleSeconds") {
          int idle_secs = GetWindowsSystemIdleSeconds();
          result->Success(flutter::EncodableValue(idle_secs));
        } else {
          result->NotImplemented();
        }
      });

  flutter_controller_->engine()->SetNextFrameCallback([&]() {
    this->Show();
  });

  // Flutter can complete the first frame before the "show window" callback is
  // registered. The following call ensures a frame is pending to ensure the
  // window is shown. It is a no-op if the first frame hasn't completed yet.
  flutter_controller_->ForceRedraw();

  return true;
}

void FlutterWindow::OnDestroy() {
  SetWindowsKeyboardLockdown(nullptr, false, false);
  if (kiosk_channel_) {
    kiosk_channel_ = nullptr;
  }
  if (jump_list_channel_) {
    jump_list_channel_ = nullptr;
  }

  if (flutter_controller_) {
    flutter_controller_ = nullptr;
  }

  Win32Window::OnDestroy();
}

LRESULT
FlutterWindow::MessageHandler(HWND hwnd, UINT const message,
                              WPARAM const wparam,
                              LPARAM const lparam) noexcept {
  if (g_kiosk_lockdown_active) {
    if (message == WM_CLOSE) {
      return 0;
    }
    if (message == WM_SYSCOMMAND) {
      const WPARAM cmd = wparam & 0xFFF0;
      if (cmd == SC_CLOSE || cmd == SC_MINIMIZE || cmd == SC_RESTORE ||
          cmd == SC_TASKLIST || cmd == SC_KEYMENU) {
        return 0;
      }
    }
  }

  // Give Flutter, including plugins, an opportunity to handle window messages.
  if (flutter_controller_) {
    std::optional<LRESULT> result =
        flutter_controller_->HandleTopLevelWindowProc(hwnd, message, wparam,
                                                      lparam);
    if (result) {
      return *result;
    }
  }

  switch (message) {
    case WM_COPYDATA: {
      auto* cds = reinterpret_cast<COPYDATASTRUCT*>(lparam);
      if (cds && cds->dwData == 1001 && cds->lpData) {
        auto* cmd_w = reinterpret_cast<const wchar_t*>(cds->lpData);
        if (jump_list_channel_) {
          int size_needed = WideCharToMultiByte(CP_UTF8, 0, cmd_w, -1, nullptr, 0, nullptr, nullptr);
          if (size_needed > 0) {
            std::string cmd_utf8(size_needed, 0);
            WideCharToMultiByte(CP_UTF8, 0, cmd_w, -1, &cmd_utf8[0], size_needed, nullptr, nullptr);
            if (!cmd_utf8.empty() && cmd_utf8.back() == '\0') {
              cmd_utf8.pop_back();
            }
            jump_list_channel_->InvokeMethod("onJumpListLaunch",
                std::make_unique<flutter::EncodableValue>(cmd_utf8));
          }
        }
      }
      return TRUE;
    }
    case WM_FONTCHANGE:
      flutter_controller_->engine()->ReloadSystemFonts();
      break;
  }

  return Win32Window::MessageHandler(hwnd, message, wparam, lparam);
}
