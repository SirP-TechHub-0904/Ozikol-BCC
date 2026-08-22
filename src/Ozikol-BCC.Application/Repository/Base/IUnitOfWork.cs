using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Repository.Base
{
    /// <summary>
    /// Application transaction boundary for repositories that stage changes before committing.
    /// </summary>
    public interface IUnitOfWork : IDisposable
    {
        Task<int> Commit();
    }
}

