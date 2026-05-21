import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export function useDocument(docRef) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!docRef);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        setData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docRef]);

  return { data, loading, error };
}

export function useCollection(queryRef) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(!!queryRef);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!queryRef) {
      setData([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot) => {
        setData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryRef]);

  return { data, loading, error };
}
