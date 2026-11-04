import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FirestorePatientStore,
  FirestorePatientStoreError
} from '../src/firestore-patient-store.js';
import { buildPatientBusinessFields } from './fixtures/emulator-data.js';

function createFakeDb({ existingPatient, occupiedDocuments = new Map() }) {
  const actions = [];

  function reference(collection, id) {
    return {
      collection,
      id,
      path: `${collection}/${id}`,
      async get() {
        if (collection === 'patients' && id === existingPatient.id) {
          return {
            exists: true,
            data: () => ({ ...existingPatient })
          };
        }
        return { exists: false, data: () => undefined };
      }
    };
  }

  return {
    actions,
    collection(name) {
      return {
        doc(id) {
          return reference(name, id);
        }
      };
    },
    async runTransaction(callback) {
      let hasWritten = false;
      const transaction = {
        async get(ref) {
          if (hasWritten) {
            throw new Error(
              'Firestore transactions require all reads to be executed before all writes.'
            );
          }
          actions.push(`get:${ref.path}`);
          const owner = occupiedDocuments.get(ref.id);
          return {
            exists: owner !== undefined,
            data: () => (owner === undefined ? undefined : { patientId: owner })
          };
        },
        delete(ref) {
          hasWritten = true;
          actions.push(`delete:${ref.path}`);
        },
        set(ref) {
          hasWritten = true;
          actions.push(`set:${ref.path}`);
        }
      };

      return callback(transaction);
    }
  };
}

test('save lee el nuevo índice antes de escribir al cambiar el documento', async () => {
  const existingPatient = {
    id: 'patient-1',
    ...buildPatientBusinessFields({ documentNumber: '30111222' })
  };
  const db = createFakeDb({ existingPatient });
  const store = new FirestorePatientStore(db);

  const updated = await store.save(existingPatient.id, {
    ...existingPatient,
    documentNumber: '30999888'
  });

  assert.equal(updated.documentNumber, '30999888');
  assert.deepEqual(db.actions, [
    'get:patientDocuments/30999888',
    'delete:patientDocuments/30111222',
    'set:patientDocuments/30999888',
    'set:patients/patient-1'
  ]);
});

test('save rechaza un documento ocupado antes de realizar escrituras', async () => {
  const existingPatient = {
    id: 'patient-1',
    ...buildPatientBusinessFields({ documentNumber: '30111222' })
  };
  const db = createFakeDb({
    existingPatient,
    occupiedDocuments: new Map([['30999888', 'patient-2']])
  });
  const store = new FirestorePatientStore(db);

  await assert.rejects(
    store.save(existingPatient.id, {
      ...existingPatient,
      documentNumber: '30999888'
    }),
    (error) => {
      assert.ok(error instanceof FirestorePatientStoreError);
      assert.equal(error.code, 'DUPLICATE_DOCUMENT');
      return true;
    }
  );

  assert.deepEqual(db.actions, ['get:patientDocuments/30999888']);
});
