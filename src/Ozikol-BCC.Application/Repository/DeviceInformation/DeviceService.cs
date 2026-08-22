using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.DeviceInformation
{
    public class DeviceService : IDeviceService
    {
        public async Task<bool> DeviceAccess(string registeredToken)
        {
            var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces();
            foreach (var networkInterface in networkInterfaces)
            {
                if (networkInterface.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                    networkInterface.OperationalStatus == OperationalStatus.Up)
                {
                    var token = networkInterface.GetPhysicalAddress().ToString();
                    if(token == registeredToken)
                    {
                        return true;
                    }
                }
            }
            return false;
        }

        public async Task<string> GetMackAddress()
        {
            var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces();
            foreach (var networkInterface in networkInterfaces)
            {
                if (networkInterface.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                    networkInterface.OperationalStatus == OperationalStatus.Up)
                {
                    return networkInterface.GetPhysicalAddress().ToString();
                }
            }
            return string.Empty;
        }
    }
}

