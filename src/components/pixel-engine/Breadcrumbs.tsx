import React from 'react';

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface Props {
  path: BreadcrumbItem[];
  onNavigate: (index: number) => void;
}

export default function Breadcrumbs({ path, onNavigate }: Props) {
  return (
    <div className="absolute top-4 left-4 z-20 flex items-center bg-gray-900/80 backdrop-blur rounded-lg px-4 py-2 border border-gray-700 text-white shadow-lg">
      {path.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && <span className="mx-2 text-gray-500">/</span>}
          <button 
            onClick={() => onNavigate(index)}
            className={`hover:text-blue-400 transition-colors ${index === path.length - 1 ? 'font-bold text-white cursor-default' : 'text-gray-300'}`}
            disabled={index === path.length - 1}
          >
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}