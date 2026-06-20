import React, { useState, useContext } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const { loginUser } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await loginUser(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        'Failed to connect to the backend server. Make sure your Eclipse Spring Boot app is running on port 8080!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container fluid className="d-flex align-items-center justify-content-center min-vh-100" style={{ background: 'var(--bg-darker)' }}>
      <Row className="w-100 justify-content-center">
        <Col md={8} lg={5} xl={4}>
          <div className="glass-panel p-5">
            <div className="text-center mb-4">
              <h2 className="fw-bold text-gradient">HelpDesk Pro</h2>
              <p className="text-muted">Sign in to your enterprise account</p>
            </div>

            {error && (
              <Alert variant="danger" className="mb-4 text-center small rounded-3" style={{ background: 'rgba(220, 53, 69, 0.1)', borderColor: 'rgba(220, 53, 69, 0.2)', color: '#ea868f' }}>
                {error}
              </Alert>
            )}

            <Form onSubmit={handleLogin}>
              <Form.Group className="mb-4" controlId="formBasicEmail">
                <Form.Label className="text-light small fw-bold">Email Address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="name@company.com"
                  className="form-control-dark p-3"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-4" controlId="formBasicPassword">
                <Form.Label className="text-light small fw-bold d-flex justify-content-between">
                  Password
                  <a href="#" className="text-muted text-decoration-none">Forgot password?</a>
                </Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter your password"
                  className="form-control-dark p-3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="w-100 p-3 btn-primary-custom fw-bold d-flex align-items-center justify-content-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Connecting...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </Form>

            <div className="text-center mt-4">
              <span className="text-muted small">Default Admin login: </span>
              <br />
              <code className="text-light small">admin@helpdesk.com / admin123</code>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
