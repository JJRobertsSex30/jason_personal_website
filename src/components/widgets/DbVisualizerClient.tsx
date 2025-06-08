import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import DbVisualizer from './DbVisualizer'; // The original visualizer component
import type { DbSchema } from '~/lib/db-schema';

const DbVisualizerClient: React.FC = () => {
  const [schema, setSchema] = useState<DbSchema | null>(null);
  const [status, setStatus] = useState<string>('Waiting for schema data...');

  useEffect(() => {
    const handleSchemaLoad = (event: Event) => {
      const customEvent = event as CustomEvent<DbSchema>;
      if (customEvent.detail) {
        setSchema(customEvent.detail);
      } else {
        setStatus('Failed to receive schema data.');
      }
    };

    document.addEventListener('db-schema-loaded', handleSchemaLoad);

    // Clean up the event listener when the component is unmounted
    return () => {
      document.removeEventListener('db-schema-loaded', handleSchemaLoad);
    };
  }, []); // The empty dependency array ensures this effect runs only once

  if (!schema) {
    // You can add a loading spinner or placeholder here
    return <div className="p-4 text-center text-gray-500">{status}</div>;
  }

  return (
    <ReactFlowProvider>
      <DbVisualizer schema={schema} />
    </ReactFlowProvider>
  );
};

export default DbVisualizerClient; 