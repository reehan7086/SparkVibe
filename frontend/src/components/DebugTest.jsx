// Create src/components/DebugTest.jsx
import React from 'react';

const DebugTest = () => {
  const handleClick = (e) => {
    console.log('DEBUG: Click working!', e.target);
    alert('Click is working!');
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
    >
      <button
        onClick={handleClick}
        style={{
          padding: '10px 20px',
          background: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          touchAction: 'auto'
        }}
      >
        🚨 TEST CLICK
      </button>
    </div>
  );
};

export default DebugTest;