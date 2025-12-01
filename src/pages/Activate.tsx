import { useEffect } from 'react';
import axios from 'axios';
import localforage from 'localforage';
import Api from '../components/Api';
import toast from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Activate = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const activate = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        navigate('/customer/profile');
        return;
      }

      const token = await localforage.getItem('authToken');
      
      // CALL THE SUBSCRIBE ENDPOINT IMMEDIATELY
      await axios.post(
        `${Api}/customer/subscribe`,
        { sessionId }, // Send the Stripe session ID
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Assistant assigned!');
      navigate('/customer/inbox'); // Go to inbox where assistant appears
    };

    activate();
  }, []);

  return (
    <div className="p-8 text-center">
      <h1>Activating your subscription...</h1>
      <p>Please wait while we assign your assistant.</p>
    </div>
  );
};

export default Activate;