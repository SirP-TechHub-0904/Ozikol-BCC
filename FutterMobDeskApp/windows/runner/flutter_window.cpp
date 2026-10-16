#include "flutter_window.h"

#include <optional>
#include <string>
#include <vector>

#include "flutter/generated_plugin_registrant.h"
#include "jump_list_manager.h"

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
