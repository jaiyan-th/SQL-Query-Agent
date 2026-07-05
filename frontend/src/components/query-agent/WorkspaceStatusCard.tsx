import React from 'react';
import { Database } from 'lucide-react';
import { type ActiveSqliteWorkspaceResponse } from '../../services/api';

interface StatusProps {
  workspace: ActiveSqliteWorkspaceResponse | null;
}

export const WorkspaceStatusCard: React.FC<StatusProps> = ({ workspace }) => {

  return (
    <div className="bg-[#151922] border border-[#252B36] rounded-[6px] p-5 text-left flex flex-col gap-4 font-sans-ui">
      <div>
        <h4 className="text-xs font-bold text-[#E6E8EF] uppercase tracking-wider flex items-center gap-2">
          <Database size={14} className="text-[#53D6CC]" />
          <span>Workspace Environment</span>
        </h4>
        <p className="text-[10px] text-[#7E8A99] mt-1 leading-normal font-semibold">
          Active workspace database context and telemetry.
        </p>
      </div>

      <div className="border-t border-[#252B36]/50 pt-4 flex flex-col gap-3 font-mono-code text-[11px] text-[#B8C0CC]">
        {workspace ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-[#7E8A99]">Filename:</span>
              <span className="text-[#E6E8EF] font-bold truncate max-w-[180px]" title={workspace.original_filename}>
                {workspace.original_filename}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7E8A99]">Workspace ID:</span>
              <span className="text-[#8B7CF6] font-bold font-mono text-[10px] truncate max-w-[120px]">
                {workspace.workspace_id}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7E8A99]">Table Count:</span>
              <span className="text-[#53D6CC] font-bold">{workspace.table_count} tables</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7E8A99]">Indexing Status:</span>
              <span className={`font-bold ${workspace.schema_indexed ? 'text-[#3ECF8E]' : 'text-[#F5C26B]'}`}>
                {workspace.schema_indexed ? 'QDRANT_READY' : 'PENDING_INDEX'}
              </span>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-[#7E8A99] italic">
            No SQLite database uploaded.
          </div>
        )}
      </div>
    </div>
  );
};
export default WorkspaceStatusCard;
