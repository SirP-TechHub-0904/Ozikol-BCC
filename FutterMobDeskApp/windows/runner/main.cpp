#include <flutter/dart_project.h>
#include <flutter/flutter_view_controller.h>
#include <windows.h>

#include "flutter_window.h"
#include "utils.h"

int APIENTRY wWinMain(_In_ HINSTANCE instance, _In_opt_ HINSTANCE prev,
                      _In_ wchar_t *command_line, _In_ int show_command) {
  // Attach to console when present (e.g., 'flutter run') or create a
  // new console when running with a debugger.
  if (!::AttachConsole(ATTACH_PARENT_PROCESS) && ::IsDebuggerPresent()) {
    CreateAndAttachConsole();
  }

  // Initialize COM, so that it is available for use in the library and/or
  // plugins.
  ::CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

  // Single-instance Jump List activation: If an instance of Ozikol is already running,
  // bring it to the foreground and forward the command line arguments via WM_COPYDATA.
  HWND existing_window = ::FindWindow(L"FLUTTER_RUNNER_WIN32_WINDOW", L"Ozikol");
  if (existing_window != nullptr) {
    if (::IsIconic(existing_window)) {
      ::ShowWindow(existing_window, SW_RESTORE);
    }
    ::SetForegroundWindow(existing_window);

    if (command_line && wcslen(command_line) > 0) {
      COPYDATASTRUCT cds;
      cds.dwData = 1001;
      cds.cbData = static_cast<DWORD>((wcslen(command_line) + 1) * sizeof(wchar_t));
      cds.lpData = static_cast<PVOID>(command_line);
      ::SendMessage(existing_window, WM_COPYDATA, 0, reinterpret_cast<LPARAM>(&cds));
    }
    ::CoUninitialize();
    return EXIT_SUCCESS;
  }

  flutter::DartProject project(L"data");

  std::vector<std::string> command_line_arguments =
      GetCommandLineArguments();

  project.set_dart_entrypoint_arguments(std::move(command_line_arguments));

  FlutterWindow window(project);
  Win32Window::Point origin(10, 10);
  Win32Window::Size size(1280, 720);
  if (!window.Create(L"Ozikol", origin, size)) {
    return EXIT_FAILURE;
  }
  window.SetQuitOnClose(true);

  ::MSG msg;
  while (::GetMessage(&msg, nullptr, 0, 0)) {
    ::TranslateMessage(&msg);
    ::DispatchMessage(&msg);
  }

  ::CoUninitialize();
  return EXIT_SUCCESS;
}
