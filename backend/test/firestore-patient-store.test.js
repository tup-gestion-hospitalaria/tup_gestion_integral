import assert from 'node:assert/strict';
import test from 'node:test';

import { FirestorePatientStore } from '../src/firestore-patient-store.js';
import { buildPatientBusinessFields } from './fixtures/emulator-data.js';

test('save lee el nuevo índice antes de escribir al cambiar el documento', async () => {
  const existing = {
    id: 'patient-1',
    ...buildPatientBusinessFields({ documentNumber: '30111222' })
  };
  const actions = [];

  const db = {
    collection(collection) {
      return {
        doc(id) {
          return {
            path: `${collection}/${id}`,
            async get() {
              return { exists: true, data: () => ({ ...existing }) };
            }
          };
        }
      };
    },
    async runTransaction(callback) {
      let hasWritten = false;
      return callback({
        async get(ref) {
          assert.equal(hasWritten, false, 'Firestore no permite lecturas después de escrituras');
          actions.push(`get:${ref.path}`);
          return { exists: false, data: () => undefined };
        },
        delete(ref) {
          hasWritten = true;
          actions.push(`delete:${ref.path}`);
        },
        set(ref) {
          hasWritten = true;
          actions.push(`set:${ref.path}`);
        }
      });
    }
  };

  const store = new FirestorePatientStore(db);
  await store.save(existing.id, { ...existing, documentNumber: '30999888' });

  assert.deepEqual(actions, [
    'get:patientDocuments/30999888',
    'delete:patientDocuments/30111222',
    'set:patientDocuments/30999888',
    'set:patients/patient-1'
  ]);
});
