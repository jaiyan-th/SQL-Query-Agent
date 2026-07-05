import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { 
  Table, 
  Network, 
  Layers, 
  Columns,
  RefreshCw
} from 'lucide-react';
import { getSqliteSchema, type SchemaTable as TableSchema } from '../../services/api';


export const SchemaBrowserPage: React.FC = () => {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchema();
  }, []);

  const loadSchema = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getSqliteSchema();
      const fetchedTables = data.tables || [];
      setTables(fetchedTables);
      
      if (fetchedTables.length > 0) {
        setSelectedTable(fetchedTables[0]);
      } else {
        setSelectedTable(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load schema browser');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 text-left">
        {/* Top Header Controls */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold font-display text-[#E6E8EF] tracking-tight">
              Schema Browser
            </h2>
            <p className="text-xs text-[#7E8A99] mt-1 font-semibold leading-relaxed">
              Explore SQLite tables, primary keys, foreign key constraints, and semantic schema embeddings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="status-chip info select-none">SQLITE_ACTIVE</span>
            <span className="status-chip info select-none">QDRANT_READY</span>
            <button 
              onClick={loadSchema}
              disabled={loading}
              className="btn-secondary h-[30px] px-3 font-mono text-[10px] uppercase font-bold flex items-center gap-1.5"
            >
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-[#EF5F5F]/5 border border-[#EF5F5F]/35 text-[#EF5F5F] px-4 py-3 rounded text-xs font-mono-code font-bold">
            <span>⚠️ {error}</span>
          </div>
        )}

        {tables.length === 0 && !loading ? (
          <div className="bg-[#151922] border border-[#252B36] rounded-[6px] p-16 text-center font-mono-code text-xs text-[#7E8A99] select-none">
            <span>-- NO DYNAMIC WORKSPACE TABLES INTROSPECTED --</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* 1. Dotted Relationship Visualizer Canvas */}
            <div className="flex flex-col gap-2">
              <h4 className="font-mono-code text-[10px] text-[#7E8A99] uppercase tracking-wider flex items-center gap-1.5">
                <Network size={12} className="text-[#53D6CC]" />
                <span>Relationship Mapping Canvas</span>
              </h4>
              <div className="relationship-map flex flex-wrap gap-4 px-6 select-none relative font-mono-code text-[11px] font-bold">
                {tables.map((t, idx) => (
                  <div key={idx} className="flex items-center">
                    <div className={`px-4 py-2 border rounded bg-[#10141B] shadow-md transition-all ${
                      selectedTable?.table_name === t.table_name
                        ? 'border-[#53D6CC] text-[#53D6CC]'
                        : 'border-[#252B36] text-[#B8C0CC]'
                    }`}>
                      {t.table_name}
                    </div>
                    {idx < tables.length - 1 && (
                      <div className="flex items-center px-2">
                        <div className="w-8 h-[1px] bg-[#252B36]" />
                        <span className="text-[9px] text-[#8B7CF6] px-1 bg-[#10141B] border border-[#252B36] rounded">FK</span>
                        <div className="w-8 h-[1px] bg-[#252B36]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Grid split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Tables List */}
              <div className="lg:col-span-4 flex flex-col gap-3">
                <h4 className="font-mono-code text-[10px] text-[#7E8A99] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={12} className="text-[#53D6CC]" />
                  <span>Database Tables</span>
                </h4>

                <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                  {tables.map((t) => {
                    const isSelected = selectedTable?.table_name === t.table_name;
                    return (
                      <div
                        key={t.table_name}
                        onClick={() => setSelectedTable(t)}
                        className={`border rounded p-4 text-left cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-[#53D6CC] bg-[#53D6CC]/5 shadow-[0_0_15px_rgba(83,214,204,0.05)]'
                            : 'border-[#252B36] bg-[#151922] hover:bg-[#202733]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Table size={16} className={isSelected ? 'text-[#53D6CC]' : 'text-[#7E8A99]'} />
                          <div className="text-left">
                            <h4 className={`text-xs font-bold font-mono-code ${isSelected ? 'text-[#53D6CC]' : 'text-[#E6E8EF]'}`}>
                              {t.table_name}
                            </h4>
                            <p className="text-[10px] text-[#7E8A99] mt-0.5 font-mono-code">
                              {t.columns.length} columns · {t.row_count} rows
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Table Metadata & Column Fields */}
              <div className="lg:col-span-8 flex flex-col gap-3">
                {selectedTable && (
                  <>
                    <h4 className="font-mono-code text-[10px] text-[#7E8A99] uppercase tracking-wider flex items-center gap-1.5">
                      <Columns size={12} className="text-[#53D6CC]" />
                      <span>Schema Field Details: {selectedTable.table_name}</span>
                    </h4>

                    <div className="bg-[#151922] border border-[#252B36] rounded-[6px] overflow-hidden">
                      <table className="schema-detail-table font-sans-ui text-xs">
                        <thead>
                          <tr className="bg-[#10141B]">
                            <th className="font-mono-code text-[10px] text-[#7E8A99]">FIELD NAME</th>
                            <th className="font-mono-code text-[10px] text-[#7E8A99]">TYPE</th>
                            <th className="font-mono-code text-[10px] text-[#7E8A99]">NULLABLE</th>
                            <th className="font-mono-code text-[10px] text-[#7E8A99]">KEY CONSTRAINT</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono-code text-xs">
                          {selectedTable.columns.map((col) => {
                            const isPK = selectedTable.primary_keys.includes(col.name);
                            const fk = selectedTable.foreign_keys.find((f) => f.columns.includes(col.name));
                            return (
                              <tr key={col.name} className="hover:bg-[#10141B]/40">
                                <td className="font-bold text-[#E6E8EF]">{col.name}</td>
                                <td className="text-[#8B7CF6] font-bold">{col.type}</td>
                                <td className="text-[#7E8A99]">{col.nullable ? 'YES' : 'NO'}</td>
                                <td>
                                  {isPK && (
                                    <span className="status-chip info text-[8px] font-bold h-5 px-2">
                                      PRIMARY_KEY
                                    </span>
                                  )}
                                  {fk && (
                                    <span className="status-chip warning text-[8px] font-bold h-5 px-2 ml-1" title={`References ${fk.referred_table}(${fk.referred_columns.join(', ')})`}>
                                      FOREIGN_KEY
                                    </span>
                                  )}
                                  {!isPK && !fk && <span className="text-[#7E8A99] font-normal">-</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
