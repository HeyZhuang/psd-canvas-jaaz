
import React, { useState } from 'react';
import { PLATFORM_ASSETS, USER_ASSETS } from '../constants';

type AssetSource = 'platform' | 'user';

export const LibraryView: React.FC = () => {
  const [source, setSource] = useState<AssetSource>('platform');
  const assets = source === 'platform' ? PLATFORM_ASSETS : USER_ASSETS;

  const sourceButtonClasses = (currentSource: AssetSource) =>
    `flex-1 py-2 text-xs font-semibold rounded-md transition-colors duration-200 ${
      source === currentSource
        ? 'bg-gray-700 text-white'
        : 'bg-gray-800 text-gray-400 hover:bg-gray-600'
    }`;

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex bg-gray-800 rounded-lg p-1 space-x-1">
        <button onClick={() => setSource('platform')} className={sourceButtonClasses('platform')}>Platform</button>
        <button onClick={() => setSource('user')} className={sourceButtonClasses('user')}>My Uploads</button>
      </div>

      {source === 'user' && (
        <button className="w-full py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-500 transition-colors">
          Upload File
        </button>
      )}

      <div className="grid grid-cols-3 gap-2">
        {assets.map(asset => (
          <div key={asset.id} className="aspect-square bg-gray-700 rounded-md overflow-hidden group cursor-pointer">
            <img 
              src={asset.url} 
              alt={asset.alt} 
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110" 
            />
          </div>
        ))}
      </div>
    </div>
  );
};
