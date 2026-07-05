import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ChartRendererProps {
  config: {
    type: 'bar' | 'pie';
    xKey?: string;
    yKey?: string;
    nameKey?: string;
    valueKey?: string;
    data: any[];
  } | null;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316'  // orange
];

export const ChartRenderer: React.FC<ChartRendererProps> = ({ config }) => {
  if (!config || !config.data || config.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-gray-500">
        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>No chart data available or structure is invalid.</span>
      </div>
    );
  }

  if (config.type === 'bar') {
    const xKey = config.xKey || 'category';
    const yKey = config.yKey || 'value';
    
    return (
      <div className="w-full h-80 bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 text-center">
          Bar Graph ({yKey} by {xKey})
        </h4>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart
            data={config.data}
            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey={xKey} 
              tick={{ fill: '#4b5563', fontSize: 11 }}
              tickLine={{ stroke: '#d1d5db' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              tick={{ fill: '#4b5563', fontSize: 11 }}
              tickLine={{ stroke: '#d1d5db' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
            />
            <Bar 
              dataKey={yKey} 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            >
              {config.data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (config.type === 'pie') {
    const nameKey = config.nameKey || 'name';
    const valueKey = config.valueKey || 'value';
    
    return (
      <div className="w-full h-80 bg-white p-4 border border-gray-200 rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-around">
        <div className="w-full md:w-1/2 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={config.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey={valueKey}
                nameKey={nameKey}
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
              >
                {config.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/3 flex flex-col justify-center space-y-2 mt-4 md:mt-0">
          <h4 className="text-sm font-semibold text-gray-700 text-center md:text-left mb-2">
            Pie Chart Distribution
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-2 overflow-y-auto max-h-48 px-2 py-1">
            {config.data.map((entry, index) => (
              <div key={index} className="flex items-center space-x-2 text-xs text-gray-600">
                <span 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate">{entry[nameKey]}: <strong>{entry[valueKey]}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
