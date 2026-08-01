import React from 'react';

const PageTitle = ({ title, subtitle }) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
      {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
};

export default PageTitle;
