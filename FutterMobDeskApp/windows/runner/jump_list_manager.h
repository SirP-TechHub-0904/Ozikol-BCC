#ifndef RUNNER_JUMP_LIST_MANAGER_H_
#define RUNNER_JUMP_LIST_MANAGER_H_

#include <string>
#include <vector>

/// Represents a workspace/organization item to be displayed in the Windows Taskbar Jump List.
struct JumpListWorkspaceItem {
  std::string tenant_key;
  std::string display_name;
};

/// Native manager interfacing with Windows Shell COM APIs (ICustomDestinationList)
/// to provide custom Recent Organizations and Tasks in the Windows Taskbar Jump List.
class JumpListManager {
 public:
  /// Updates the Windows Taskbar Jump List with recent organizations and standard tasks.
  static bool UpdateWorkspaces(const std::vector<JumpListWorkspaceItem>& workspaces);

  /// Clears custom categories and tasks from the Jump List.
  static bool Clear();
};

#endif  // RUNNER_JUMP_LIST_MANAGER_H_
