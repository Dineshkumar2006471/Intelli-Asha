import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => {
  const addMock = vi.fn().mockResolvedValue({ id: 'mock-doc-id' });
  const collectionMock = vi.fn(() => ({ add: addMock }));
  const dbMock = { collection: collectionMock };
  
  return {
    getFirestore: vi.fn(() => dbMock),
    FieldValue: {
      serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
    },
  };
});

import { writeAgentLog } from '../services/agentLogger';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

describe('agentLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should write an agent log to firestore and return the document id', async () => {
    const entry = {
      agentName: 'FIELD_AGENT' as const,
      action: 'PROCESS_AUDIO',
      details: 'Processed 5s audio',
      severity: 'info' as const,
    };

    const docId = await writeAgentLog(entry);

    expect(docId).toBe('mock-doc-id');
    const db = getFirestore();
    expect(db.collection).toHaveBeenCalledWith('agent_logs');
    const addFn = db.collection('agent_logs').add;
    
    expect(addFn).toHaveBeenCalledWith({
      ...entry,
      timestamp: 'MOCK_TIMESTAMP',
    });
    
    expect(FieldValue.serverTimestamp).toHaveBeenCalled();
  });
});
