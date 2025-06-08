import React, { useState, useEffect } from 'react';
import DbVisualizer from './DbVisualizer';
import type { DbSchema } from '~/lib/db-schema';

const DbVisualizerClient: React.FC = () => {
  const [schema, setSchema] = useState<DbSchema | null>(null);
  const [status, setStatus] = useState<string>('Loading schema...');

  const loadSchema = async () => {
    setStatus('Fetching latest schema...');
    try {
      const response = await fetch('/db-schema.json?t=' + new Date().getTime());
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data: DbSchema = await response.json();
      setSchema(data);
    } catch (error) {
      console.error('Error loading schema:', error);
      setStatus('Could not load schema. Please try scanning the database.');
    }
  };

  useEffect(() => {
    // Load schema from the existing JSON on initial mount
    loadSchema();

    const handleSchemaLoad = (event: Event) => {
      const customEvent = event as CustomEvent<DbSchema>;
      if (customEvent.detail) {
        setSchema(customEvent.detail);
      } else {
        // If the event has no detail, it might be a signal to just reload
        loadSchema();
      }
    };

    document.addEventListener('db-schema-loaded', handleSchemaLoad);

    return () => {
      document.removeEventListener('db-schema-loaded', handleSchemaLoad);
    };
  }, []);

  if (!schema) {
    return <div className="p-4 text-center text-gray-500">{status}</div>;
  }

  return (
    // The DbVisualizer now handles its own provider
    <DbVisualizer schema={schema} />
  );
};

export default DbVisualizerClient; 