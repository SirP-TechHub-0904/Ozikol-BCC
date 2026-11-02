#include "jump_list_manager.h"

#include <windows.h>
#include <shobjidl.h>
#include <propkey.h>
#include <propvarutil.h>
#include <wrl/client.h>

using Microsoft::WRL::ComPtr;

namespace {

std::wstring Utf8ToWide(const std::string& str) {
  if (str.empty()) {
    return std::wstring();
  }
  int size_needed = MultiByteToWideChar(CP_UTF8, 0, &str[0], static_cast<int>(str.size()), nullptr, 0);
  std::wstring wstr(size_needed, 0);
  MultiByteToWideChar(CP_UTF8, 0, &str[0], static_cast<int>(str.size()), &wstr[0], size_needed);
  return wstr;
}

ComPtr<IShellLinkW> CreateShellLink(const std::wstring& exe_path,
                                    const std::wstring& title,
                                    const std::wstring& arguments,
                                    const std::wstring& description,
                                    int icon_index = 0) {
  ComPtr<IShellLinkW> link;
  HRESULT hr = CoCreateInstance(CLSID_ShellLink, nullptr, CLSCTX_INPROC_SERVER,
                                IID_PPV_ARGS(&link));
  if (FAILED(hr)) {
    return nullptr;
  }

  link->SetPath(exe_path.c_str());
  link->SetArguments(arguments.c_str());
  link->SetIconLocation(exe_path.c_str(), icon_index);
  link->SetDescription(description.c_str());

  ComPtr<IPropertyStore> prop_store;
  hr = link.As(&prop_store);
  if (SUCCEEDED(hr)) {
    PROPVARIANT pv;
    hr = InitPropVariantFromString(title.c_str(), &pv);
    if (SUCCEEDED(hr)) {
      prop_store->SetValue(PKEY_Title, pv);
      prop_store->Commit();
      PropVariantClear(&pv);
    }
  }

  return link;
}

}  // namespace

bool JumpListManager::UpdateWorkspaces(const std::vector<JumpListWorkspaceItem>& workspaces) {
  wchar_t exe_path[MAX_PATH];
  if (GetModuleFileNameW(nullptr, exe_path, MAX_PATH) == 0) {
    return false;
  }

  ComPtr<ICustomDestinationList> dest_list;
  HRESULT hr = CoCreateInstance(CLSID_DestinationList, nullptr, CLSCTX_INPROC_SERVER,
                                IID_PPV_ARGS(&dest_list));
  if (FAILED(hr)) {
    return false;
  }

  UINT min_slots = 0;
  ComPtr<IObjectArray> removed_items;
  hr = dest_list->BeginList(&min_slots, IID_PPV_ARGS(&removed_items));
  if (FAILED(hr)) {
    return false;
  }

  // 1. Add "Recent Organizations" Custom Category
  if (!workspaces.empty()) {
    ComPtr<IObjectCollection> org_collection;
    hr = CoCreateInstance(CLSID_EnumerableObjectCollection, nullptr, CLSCTX_INPROC_SERVER,
                          IID_PPV_ARGS(&org_collection));
    if (SUCCEEDED(hr)) {
      for (const auto& ws : workspaces) {
        std::wstring title = Utf8ToWide(ws.display_name.empty() ? ws.tenant_key : ws.display_name);
        std::wstring args = L"--tenant=" + Utf8ToWide(ws.tenant_key);
        std::wstring desc = L"Switch to " + title + L" workspace";

        auto link = CreateShellLink(exe_path, title, args, desc, 0);
        if (link) {
          org_collection->AddObject(link.Get());
        }
      }

      ComPtr<IObjectArray> org_array;
      hr = org_collection.As(&org_array);
      if (SUCCEEDED(hr)) {
        dest_list->AppendCategory(L"Recent Organizations", org_array.Get());
      }
    }
  }

  // 2. Add Standard Tasks ("New Workspace Sign In", "Switch Organization")
  ComPtr<IObjectCollection> task_collection;
  hr = CoCreateInstance(CLSID_EnumerableObjectCollection, nullptr, CLSCTX_INPROC_SERVER,
                        IID_PPV_ARGS(&task_collection));
  if (SUCCEEDED(hr)) {
    auto task_new = CreateShellLink(exe_path, L"New Workspace Sign In", L"--action=new-workspace",
                                    L"Connect and sign in to a new tenant organization");
    if (task_new) {
      task_collection->AddObject(task_new.Get());
    }

    auto task_switch = CreateShellLink(exe_path, L"Switch Organization", L"--action=switch-workspace",
                                       L"Open workspace switcher dock");
    if (task_switch) {
      task_collection->AddObject(task_switch.Get());
    }

    ComPtr<IObjectArray> task_array;
    hr = task_collection.As(&task_array);
    if (SUCCEEDED(hr)) {
      dest_list->AddUserTasks(task_array.Get());
    }
  }

  hr = dest_list->CommitList();
  return SUCCEEDED(hr);
}

bool JumpListManager::Clear() {
  ComPtr<ICustomDestinationList> dest_list;
  HRESULT hr = CoCreateInstance(CLSID_DestinationList, nullptr, CLSCTX_INPROC_SERVER,
                                IID_PPV_ARGS(&dest_list));
  if (FAILED(hr)) {
    return false;
  }

  hr = dest_list->DeleteList(nullptr);
  return SUCCEEDED(hr);
}
