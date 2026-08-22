using Ozikol_BCC.Application.Dtos.NotifyDtos;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.NotifyRegister
{
    /// <summary>
    /// Application contract for recording notifications that can later be surfaced in BCP UI.
    /// </summary>
    public interface INotifyRegisterService
    {
        Task RegisterNotification(NotifyDto obj);

    }
}

