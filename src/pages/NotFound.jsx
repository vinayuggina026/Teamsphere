import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1>Not Found</h1>
      <Link to="/">Go to Dashboard</Link>
    </div>
  );
};

export default NotFound;
