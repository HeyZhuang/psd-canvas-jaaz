
import React, { useState } from 'react';
import { MOCK_LAYERS } from '../constants';
import type { Layer } from '../types';
import { FolderIcon, ImageIcon, TextIcon, ShapeIcon, EyeOpenIcon, EyeClosedIcon, LockClosedIcon, LockOpenIcon, ChevronRightIcon } from './Icons';

interface LayerItemProps {
  layer: Layer;
  level: number;
}

const LayerItem: React.FC<LayerItemProps> = ({ layer, level }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(layer.isVisible);
  const [isLocked, setIsLocked] = useState(layer.isLocked);

  const isGroup = layer.type === 'group';

  const getIcon = () => {
    switch (layer.type) {
      case 'group': return <FolderIcon className="w-5 h-5 text-gray-400" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-blue-400" />;
      case 'text': return <TextIcon className="w-5 h-5 text-green-400" />;
      case 'shape': return <ShapeIcon className="w-5 h-5 text-purple-400" />;
      default: return null;
    }
  };

  return (
    <div>
      <div
        className={`flex items-center p-2 rounded-md hover:bg-gray-700 cursor-pointer transition-colors duration-150 ${!isVisible ? 'opacity-50' : ''}`}
        style={{ paddingLeft: `${0.5 + level * 1.5}rem` }}
        onClick={() => isGroup && setIsExpanded(!isExpanded)}
      >
        {isGroup && (
          <ChevronRightIcon className={`w-5 h-5 text-gray-500 mr-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
        )}
        <div className="mr-3">{getIcon()}</div>
        <span className="flex-1 text-sm truncate">{layer.name}</span>
        <div className="flex items-center space-x-2 text-gray-500">
          <button onClick={(e) => { e.stopPropagation(); setIsLocked(!isLocked); }} className="hover:text-white">
            {isLocked ? <LockClosedIcon /> : <LockOpenIcon />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIsVisible(!isVisible); }} className="hover:text-white">
            {isVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
          </button>
        </div>
      </div>
      {isGroup && isExpanded && layer.children && (
        <div>
          {layer.children.map(child => <LayerItem key={child.id} layer={child} level={level + 1} />)}
        </div>
      )}
    </div>
  );
};

export const LayersPanel: React.FC = () => {
  return (
    <div className="p-2 space-y-1">
      {MOCK_LAYERS.map(layer => (
        <LayerItem key={layer.id} layer={layer} level={0} />
      ))}
    </div>
  );
};
