import 'package:flutter_test/flutter_test.dart';
import 'package:ozikol_app/core/models/workspace.dart';
import 'package:ozikol_app/core/services/windows_jump_list_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('WindowsJumpListService Tests', () {
    tearDown(() {
      WindowsJumpListService.onTenantSelectedFromJumpList = null;
      WindowsJumpListService.onNewWorkspaceAction = null;
      WindowsJumpListService.onSwitchWorkspaceAction = null;
    });

    test('handleJumpListArgument parses --tenant argument and fires callback', () {
      String? selectedTenant;
      WindowsJumpListService.onTenantSelectedFromJumpList = (tenant) {
        selectedTenant = tenant;
      };

      WindowsJumpListService.handleJumpListArgument('--tenant=cocacola');
      expect(selectedTenant, 'cocacola');

      WindowsJumpListService.handleJumpListArgument('ozikol.exe "--tenant=rozzy-touchxcx"');
      expect(selectedTenant, 'rozzy-touchxcx');
    });

    test('handleJumpListArgument parses --action=new-workspace', () {
      bool actionFired = false;
      WindowsJumpListService.onNewWorkspaceAction = () {
        actionFired = true;
      };

      WindowsJumpListService.handleJumpListArgument('--action=new-workspace');
      expect(actionFired, isTrue);
    });

    test('handleJumpListArgument parses --action=switch-workspace', () {
      bool actionFired = false;
      WindowsJumpListService.onSwitchWorkspaceAction = () {
        actionFired = true;
      };

      WindowsJumpListService.handleJumpListArgument('--action=switch-workspace');
      expect(actionFired, isTrue);
    });

    test('syncEnrolledWorkspaces handles non-Windows platforms gracefully', () async {
      final workspaces = [
        Workspace(
          tenantKey: 'rozzy-touchxcx',
          organizationName: 'Rozzy Touchxcx',
          primaryDomain: 'rozzy-touchxcx.localhost:4200',
          lastAccessed: DateTime.now(),
        ),
        Workspace(
          tenantKey: 'cocacola',
          organizationName: 'Coca-Cola Hellenic',
          primaryDomain: 'cocacola.localhost:4200',
          lastAccessed: DateTime.now(),
        ),
      ];

      // On non-Windows platforms (like test runner or web), returns false without error
      final result = await WindowsJumpListService.syncEnrolledWorkspaces(workspaces);
      expect(result, isFalse);
    });
  });
}
