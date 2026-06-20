import React, { useState, useEffect, useContext, useRef } from 'react';
import { Container, Row, Col, Card, Badge, Table, Button, Modal, Form, Offcanvas, ListGroup, Nav, Tab, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import * as ticketApi from '../api/tickets';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser, logoutUser } = useContext(AuthContext);

  // States
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Terminal log events simulation & actual logs
  const [terminalLogs, setTerminalLogs] = useState([
    'SYSTEM INITIALIZED.',
    'SECURITY POLICY ENFORCED [SPRING SECURITY 7.0.5]',
    'WEBSOCKET CONNECTION PENDING...'
  ]);

  // Create Ticket Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: 'TECHNICAL'
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Selected Ticket Offcanvas Details State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // WebSocket Ref
  const stompClientRef = useRef(null);

  // Redirect to Login if unauthorized
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else {
      fetchDashboardData();
      connectWebSocket();
    }
    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [currentUser]);

  const addTerminalLog = (message) => {
    const time = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev.slice(-15), `[${time}] > ${message}`]);
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  // WebSocket setup using modern @stomp/stompjs Client
  const connectWebSocket = () => {
    try {
      const stompClient = new Client({
        webSocketFactory: () => new SockJS('/ws'),
        debug: () => { }, // Suppress console log spam
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      stompClient.onConnect = (frame) => {
        stompClientRef.current = stompClient;
        addTerminalLog('WEBSOCKET CONNECTION COMPLETED ON /ws');

        stompClient.subscribe('/topic/dashboard', (msg) => {
          addTerminalLog(`BROADCAST TRIGGER RECEIVED: REFRESHING TICKETS MATRIX`);
          fetchDashboardData(true); // silent refresh
        });
      };

      stompClient.onStompError = (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        addTerminalLog('WEBSOCKET ERROR - VERIFY SERVER IS RUNNING');
      };

      stompClient.onWebSocketClose = () => {
        addTerminalLog('WEBSOCKET OFFLINE - RECONNECT PENDING...');
      };

      stompClient.activate();
    } catch (e) {
      console.error(e);
    }
  };

  const broadcastUpdate = () => {
    if (stompClientRef.current && stompClientRef.current.active) {
      stompClientRef.current.publish({
        destination: '/app/dashboard.updates',
        body: 'update'
      });
    }
  };

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const ticketList = await ticketApi.getTickets();
      setTickets(ticketList);

      const roleStr = currentUser.roles?.join(', ') || '';
      if (roleStr.includes('ADMIN') || roleStr.includes('AGENT')) {
        const agentList = await ticketApi.getAgents();
        setAgents(agentList);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data. Please make sure the backend is active.');
      addTerminalLog('ERROR FETCHING DB DATA - VERIFY SPRING BOOT PORT 8080');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      const created = await ticketApi.createTicket(newTicket);
      setShowCreateModal(false);
      setNewTicket({ title: '', description: '', priority: 'MEDIUM', category: 'TECHNICAL' });
      addTerminalLog(`TICKET #${created.id} SUBMITTED: ${created.title}`);
      await fetchDashboardData();
      broadcastUpdate();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create ticket.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setDetailsLoading(true);
    setComments([]);
    setLogs([]);
    addTerminalLog(`OPENING DETAILED VIEW FOR TICKET #${ticket.id}`);
    try {
      const [commentList, logList] = await Promise.all([
        ticketApi.getComments(ticket.id),
        ticketApi.getActivityLogs(ticket.id)
      ]);
      setComments(commentList);
      setLogs(logList);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusChange = async (ticketId, status) => {
    try {
      const updatedTicket = await ticketApi.updateTicketStatus(ticketId, status);
      setSelectedTicket(updatedTicket);
      addTerminalLog(`TICKET #${ticketId} STATUS CHANGED TO: ${status}`);
      await fetchDashboardData(true);
      broadcastUpdate();
      // Reload logs
      const logList = await ticketApi.getActivityLogs(ticketId);
      setLogs(logList);
    } catch (err) {
      console.error(err);
      alert('Failed to update ticket status.');
    }
  };

  const handleAgentAssignment = async (ticketId, agentId) => {
    try {
      const updatedTicket = await ticketApi.assignAgent(ticketId, agentId || null);
      setSelectedTicket(updatedTicket);
      const agentObj = agents.find(a => a.id.toString() === agentId);
      addTerminalLog(`TICKET #${ticketId} ASSIGNED TO: ${agentObj ? agentObj.fullName : 'UNASSIGNED'}`);
      await fetchDashboardData(true);
      broadcastUpdate();
      // Reload logs
      const logList = await ticketApi.getActivityLogs(ticketId);
      setLogs(logList);
    } catch (err) {
      console.error(err);
      alert('Failed to assign agent.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentContent.trim()) return;

    setCommentSubmitting(true);
    try {
      const newComment = await ticketApi.addComment(selectedTicket.id, newCommentContent, isInternalComment);
      setComments([...comments, newComment]);
      setNewCommentContent('');
      setIsInternalComment(false);
      addTerminalLog(`COMMENT ADDED TO TICKET #${selectedTicket.id}`);
      broadcastUpdate();
      // Reload logs
      const logList = await ticketApi.getActivityLogs(selectedTicket.id);
      setLogs(logList);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to add comment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Helper formatting values
  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'LOW': return <Badge bg="secondary" className="px-2 py-1">LOW</Badge>;
      case 'MEDIUM': return <Badge bg="info" text="dark" className="px-2 py-1">MEDIUM</Badge>;
      case 'HIGH': return <Badge bg="warning" text="dark" className="px-2 py-1">HIGH</Badge>;
      case 'URGENT': return <Badge bg="danger" className="px-2 py-1">URGENT</Badge>;
      case 'CRITICAL': return <Badge bg="danger" className="px-2 py-1 border border-light">CRITICAL</Badge>;
      default: return <Badge bg="light">{prio}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN': return <Badge bg="warning" text="dark" className="px-2 py-1">OPEN</Badge>;
      case 'IN_PROGRESS': return <Badge bg="primary" className="px-2 py-1">IN PROGRESS</Badge>;
      case 'WAITING_FOR_CUSTOMER': return <Badge bg="info" text="dark" className="px-2 py-1">WAITING</Badge>;
      case 'RESOLVED': return <Badge bg="success" className="px-2 py-1">RESOLVED</Badge>;
      case 'CLOSED': return <Badge bg="dark" className="px-2 py-1 border border-secondary">CLOSED</Badge>;
      default: return <Badge bg="light">{status}</Badge>;
    }
  };

  // Roles verification helpers
  const roleString = currentUser?.roles?.join(', ') || '';
  const isAgentOrAdmin = roleString.includes('ADMIN') || roleString.includes('AGENT');

  // Stats calculations
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const myAssignedCount = tickets.filter(t => t.agentId === currentUser?.id).length;

  // Real-time filtering logic
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategoryFilter === 'ALL' || t.category === selectedCategoryFilter;
    const matchesPriority = selectedPriorityFilter === 'ALL' || t.priority === selectedPriorityFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || t.status === selectedStatusFilter;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  return (
    <div className="min-vh-100" style={{ background: 'var(--bg-darker)' }}>
      {/* Top Navbar */}
      <nav className="glass-panel p-3 mb-4 d-flex justify-content-between align-items-center mx-3 mt-3">
        <div className="d-flex align-items-center">
          <h4 className="m-0 text-gradient fw-bold">HelpDesk Pro Workspace</h4>
          <Badge bg="dark" className="ms-3 border border-secondary small text-success tracking-widest">
            ● SYSTEM ONLINE
          </Badge>
        </div>
        <div className="d-flex align-items-center">
          <span className="me-3 text-light small">
            Signed in as: <strong className="text-gradient">{currentUser?.fullName}</strong> ({roleString})
          </span>
          <Button className="btn-outline-custom btn-sm px-3" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </nav>

      <Container fluid className="px-4">
        {error && <Alert variant="danger" className="mx-3 rounded-0">{error}</Alert>}

        {/* Stats and Cyber-Charts Row */}
        <Row className="mb-4">
          <Col lg={8}>
            <Row className="h-100 g-3">
              <Col md={6}>
                <Card className="glass-panel brutalist-card-violet h-100 p-3">
                  <Card.Body className="d-flex flex-column justify-content-between">
                    <div>
                      <h6 className="text-muted small fw-bold tracking-widest mb-2">TOTAL SERVICE VOLUME</h6>
                      <h1 className="text-light mb-0 fw-bold display-4">{loading ? '...' : totalCount}</h1>
                    </div>
                    <div className="mt-3">
                      <span className="text-muted small font-monospace">> db.tickets.find().count()</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="glass-panel brutalist-card-green h-100 p-3">
                  <Card.Body className="d-flex flex-column justify-content-between">
                    <div>
                      <h6 className="text-muted small fw-bold tracking-widest mb-2">ACTIVE UNRESOLVED</h6>
                      <h1 className="text-warning mb-0 fw-bold display-4">{loading ? '...' : openCount}</h1>
                    </div>
                    <div className="mt-3">
                      <span className="text-muted small font-monospace">> db.tickets.filter(active)</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="glass-panel brutalist-card-green h-100 p-3">
                  <Card.Body className="d-flex flex-column justify-content-between">
                    <div>
                      <h6 className="text-muted small fw-bold tracking-widest mb-2">RESOLVED ACTIONS</h6>
                      <h1 className="text-success mb-0 fw-bold display-4">{loading ? '...' : resolvedCount}</h1>
                    </div>
                    <div className="mt-3">
                      <span className="text-muted small font-monospace">> SLA Target: 98.4% Achieved</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="glass-panel brutalist-card-violet h-100 p-3">
                  <Card.Body className="d-flex flex-column justify-content-between">
                    <div>
                      <h6 className="text-muted small fw-bold tracking-widest mb-2">
                        {isAgentOrAdmin ? 'MY ASSIGNED QUEUE' : 'MY ACTIVE SUBMISSIONS'}
                      </h6>
                      <h1 className="text-info mb-0 fw-bold display-4">
                        {loading ? '...' : isAgentOrAdmin ? myAssignedCount : openCount}
                      </h1>
                    </div>
                    <div className="mt-3">
                      <span className="text-muted small font-monospace">> Active Queue Load: Normal</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>

          {/* SVG Futuristic Brutalist Chart */}
          <Col lg={4}>
            <Card className="glass-panel h-100 p-3">
              <Card.Body className="d-flex flex-column justify-content-between">
                <div>
                  <h6 className="text-muted small fw-bold tracking-widest mb-3">TICKET ANALYTICS MATRIX</h6>
                  {loading ? (
                    <div className="text-center py-4 text-muted font-monospace">Computing matrix...</div>
                  ) : (
                    <div className="d-flex justify-content-around align-items-center py-2">
                      {/* Custom SVG Bar Chart */}
                      <svg width="220" height="120" style={{ background: '#020202', border: '1px solid #111' }}>
                        {/* Open Bar */}
                        <rect x="30" y={110 - Math.min(80, (openCount / (totalCount || 1)) * 80)} width="25" height={Math.min(80, (openCount / (totalCount || 1)) * 80)} fill="#ffc107" />
                        <text x="32" y="118" fill="#888" fontSize="8" fontFamily="monospace">OPEN</text>
                        {/* Resolved Bar */}
                        <rect x="95" y={110 - Math.min(80, (resolvedCount / (totalCount || 1)) * 80)} width="25" height={Math.min(80, (resolvedCount / (totalCount || 1)) * 80)} fill="#198754" />
                        <text x="96" y="118" fill="#888" fontSize="8" fontFamily="monospace">SOLVED</text>
                        {/* Total Bar */}
                        <rect x="160" y="30" width="25" height="80" fill="#39ff14" />
                        <text x="162" y="118" fill="#888" fontSize="8" fontFamily="monospace">TOTAL</text>
                      </svg>

                      <div className="small font-monospace text-muted">
                        <div><strong className="text-warning">■</strong> Open: {openCount}</div>
                        <div className="mt-2"><strong className="text-success">■</strong> Solved: {resolvedCount}</div>
                        <div className="mt-2"><strong className="text-success" style={{ color: '#39ff14' }}>■</strong> Total: {totalCount}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 border-top border-secondary pt-2">
                  <span className="text-muted small font-monospace">> Live visualization matrix</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Live Filter Controls */}
        <Row className="mb-3">
          <Col>
            <div className="glass-panel p-3 d-flex flex-wrap gap-3 align-items-center justify-content-between">
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Form.Control
                  type="text"
                  placeholder="SEARCH SUBMISSIONS..."
                  className="form-control-dark py-2 px-3 small font-monospace"
                  style={{ width: '260px' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* Category Filter */}
                <Form.Select
                  className="form-control-dark py-2 px-3 small font-monospace"
                  style={{ width: '150px' }}
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                >
                  <option value="ALL">ALL CATEGORIES</option>
                  <option value="TECHNICAL">TECHNICAL</option>
                  <option value="BILLING">BILLING</option>
                  <option value="ACCOUNT">ACCOUNT</option>
                  <option value="NETWORK">NETWORK</option>
                  <option value="HR">HR</option>
                  <option value="OTHER">OTHER</option>
                </Form.Select>

                {/* Priority Filter */}
                <Form.Select
                  className="form-control-dark py-2 px-3 small font-monospace"
                  style={{ width: '150px' }}
                  value={selectedPriorityFilter}
                  onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                >
                  <option value="ALL">ALL PRIORITIES</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                  <option value="CRITICAL">CRITICAL</option>
                </Form.Select>

                {/* Status Filter */}
                <Form.Select
                  className="form-control-dark py-2 px-3 small font-monospace"
                  style={{ width: '150px' }}
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="WAITING_FOR_CUSTOMER">WAITING</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </Form.Select>
              </div>

              <div>
                <Button
                  className="btn-primary-custom px-4 py-2"
                  onClick={() => setShowCreateModal(true)}
                >
                  + Create Ticket
                </Button>
              </div>
            </div>
          </Col>
        </Row>

        {/* Tickets and Terminal Section */}
        <Row className="g-4">
          <Col lg={9}>
            <Card className="glass-panel border-0">
              <Card.Header className="bg-transparent border-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
                <h5 className="text-light m-0 font-monospace tracking-widest fw-bold">> TICKET_REGISTRY_MATRIX</h5>
                <span className="text-muted small font-monospace">Showing {filteredTickets.length} items</span>
              </Card.Header>
              <Card.Body>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="light" />
                    <p className="text-muted mt-3">Loading tickets from server...</p>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-5 text-muted font-monospace">
                    <p className="mb-0">> RECORD NOT FOUND WITH CURRENT PARAMETERS.</p>
                  </div>
                ) : (
                  <Table hover responsive className="brutalist-table text-light align-middle mt-3" style={{ '--bs-table-bg': 'transparent', '--bs-table-color': 'var(--text-light)', '--bs-table-hover-color': 'var(--text-light)', '--bs-table-hover-bg': 'rgba(255,255,255,0.03)' }}>
                    <thead>
                      <tr>
                        <th className="border-secondary text-muted pb-3">ID</th>
                        <th className="border-secondary text-muted pb-3">Category</th>
                        <th className="border-secondary text-muted pb-3">Subject / Details</th>
                        <th className="border-secondary text-muted pb-3">Owner</th>
                        <th className="border-secondary text-muted pb-3">Assignee</th>
                        <th className="border-secondary text-muted pb-3">Priority</th>
                        <th className="border-secondary text-muted pb-3">Status</th>
                        <th className="border-secondary text-muted pb-3 text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map((t) => (
                        <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectTicket(t)}>
                          <td className="border-secondary text-muted">#{t.id}</td>
                          <td className="border-secondary text-muted small">{t.category}</td>
                          <td className="border-secondary">
                            <div className="fw-bold">{t.title}</div>
                            <div className="text-muted small text-truncate" style={{ maxWidth: '240px' }}>{t.description}</div>
                          </td>
                          <td className="border-secondary small">{t.customerName}</td>
                          <td className="border-secondary small text-info">
                            {t.agentName || <span className="text-muted italic">Unassigned</span>}
                          </td>
                          <td className="border-secondary">{getPriorityBadge(t.priority)}</td>
                          <td className="border-secondary">{getStatusBadge(t.status)}</td>
                          <td className="border-secondary text-end">
                            <Button
                              variant="link"
                              className="text-primary text-decoration-none p-0 fw-bold"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectTicket(t);
                              }}
                            >
                              Manage
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Hacker Terminal Logs Section */}
          <Col lg={3}>
            <Card className="glass-panel h-100 p-3 font-monospace" style={{ background: '#020202', border: '1px solid #1c1c1c' }}>
              <div className="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary pb-2">
                <span className="text-success small fw-bold tracking-widest">● LIVE SYSTEM AUDIT FEED</span>
                <span className="text-muted small" style={{ fontSize: '0.7rem' }}>TTY1</span>
              </div>

              <div
                className="text-success small overflow-y-auto mb-2"
                style={{ height: '340px', fontSize: '0.75rem', lineHeight: '1.5', fontFamily: 'var(--font-mono)' }}
              >
                {terminalLogs.map((log, i) => (
                  <div key={i} className="mb-2">{log}</div>
                ))}
              </div>

              <div className="border-top border-secondary pt-2 mt-auto text-muted small" style={{ fontSize: '0.7rem' }}>
                Server port: 8080 | SSL: Disabled
              </div>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Slide-Out Ticket Management Sidebar */}
      <Offcanvas
        show={selectedTicket !== null}
        onHide={() => setSelectedTicket(null)}
        placement="end"
        style={{ width: '600px', background: 'var(--bg-dark)', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', color: 'white' }}
      >
        {selectedTicket && (
          <>
            <Offcanvas.Header closeButton closeVariant="white" className="border-bottom border-secondary">
              <Offcanvas.Title className="fw-bold font-monospace">
                TICKET_DESK <span className="text-muted small">#{selectedTicket.id}</span>
              </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body className="p-0">
              <Tab.Container defaultActiveKey="overview">
                <Nav className="nav-tabs-dark border-bottom border-secondary px-3">
                  <Nav.Item>
                    <Nav.Link eventKey="overview" className="px-4 py-3 text-light">Overview</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="comments" className="px-4 py-3 text-light position-relative">
                      Comments & Notes
                      {comments.length > 0 && (
                        <Badge bg="primary" className="ms-2 rounded-0 small">{comments.length}</Badge>
                      )}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="history" className="px-4 py-3 text-light">Audit Logs</Nav.Link>
                  </Nav.Item>
                </Nav>

                <Tab.Content className="p-4" style={{ height: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                  {detailsLoading ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="light" />
                    </div>
                  ) : (
                    <>
                      {/* Overview Tab */}
                      <Tab.Pane eventKey="overview">
                        <div className="mb-4">
                          <h4 className="fw-bold mb-2">{selectedTicket.title}</h4>
                          <div className="d-flex gap-2 align-items-center mb-3">
                            {getStatusBadge(selectedTicket.status)}
                            {getPriorityBadge(selectedTicket.priority)}
                            <Badge bg="dark" className="border border-secondary">{selectedTicket.category}</Badge>
                          </div>
                        </div>

                        <Card className="glass-panel border-0 mb-4 p-3">
                          <h6 className="text-muted small fw-bold mb-2 font-monospace">> DESCRIPTION_FEED</h6>
                          <p className="text-light mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                            {selectedTicket.description}
                          </p>
                        </Card>

                        {/* Metadata Details */}
                        <div className="glass-panel p-3 mb-4 rounded-0">
                          <Row className="mb-3">
                            <Col xs={4} className="text-muted small fw-bold font-monospace">OWNER</Col>
                            <Col xs={8} className="small">{selectedTicket.customerName}</Col>
                          </Row>
                          <Row className="mb-3 align-items-center">
                            <Col xs={4} className="text-muted small fw-bold font-monospace">ASSIGNEE</Col>
                            <Col xs={8}>
                              {isAgentOrAdmin ? (
                                <Form.Select
                                  size="sm"
                                  className="form-control-dark"
                                  value={selectedTicket.agentId || ''}
                                  onChange={(e) => handleAgentAssignment(selectedTicket.id, e.target.value)}
                                >
                                  <option value="">-- Unassigned --</option>
                                  {agents.map(a => (
                                    <option key={a.id} value={a.id}>{a.fullName}</option>
                                  ))}
                                </Form.Select>
                              ) : (
                                <span className="small text-info">{selectedTicket.agentName || 'Not Assigned Yet'}</span>
                              )}
                            </Col>
                          </Row>
                          <Row className="mb-3 align-items-center">
                            <Col xs={4} className="text-muted small fw-bold font-monospace">STATUS</Col>
                            <Col xs={8}>
                              <Form.Select
                                size="sm"
                                className="form-control-dark"
                                value={selectedTicket.status}
                                onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                              >
                                <option value="OPEN">OPEN</option>
                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                <option value="WAITING_FOR_CUSTOMER">WAITING FOR CUSTOMER</option>
                                <option value="RESOLVED">RESOLVED</option>
                                <option value="CLOSED">CLOSED</option>
                              </Form.Select>
                            </Col>
                          </Row>
                          <Row>
                            <Col xs={4} className="text-muted small fw-bold font-monospace">CREATED ON</Col>
                            <Col xs={8} className="small text-muted font-monospace">
                              {new Date(selectedTicket.createdAt).toLocaleString()}
                            </Col>
                          </Row>
                        </div>
                      </Tab.Pane>

                      {/* Comments & Notes Tab */}
                      <Tab.Pane eventKey="comments">
                        <div className="mb-4" style={{ maxHeight: '60%', overflowY: 'auto' }}>
                          {comments.length === 0 ? (
                            <p className="text-muted text-center py-4 my-0 font-monospace">> NO COMMENTS POSTED YET.</p>
                          ) : (
                            <ListGroup variant="flush">
                              {comments.map(c => (
                                <ListGroup.Item
                                  key={c.id}
                                  className="border-0 mb-3 p-3 rounded-0"
                                  style={{
                                    background: c.isInternal ? 'rgba(255, 193, 7, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                                    borderLeft: c.isInternal ? '4px solid var(--accent-violet)' : '4px solid var(--accent-green)',
                                    color: 'white'
                                  }}
                                >
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-bold small d-flex align-items-center font-monospace">
                                      {c.authorName}
                                      {c.isInternal && (
                                        <Badge bg="warning" text="dark" className="ms-2 small py-1 px-2">
                                          🔒 STAFF INTERNAL NOTE
                                        </Badge>
                                      )}
                                    </span>
                                    <span className="text-muted small font-monospace" style={{ fontSize: '0.75rem' }}>
                                      {new Date(c.createdAt).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{c.content}</p>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          )}
                        </div>

                        {/* Add Comment Form */}
                        <Form onSubmit={handleAddComment} className="glass-panel p-3 rounded-0">
                          <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted font-monospace">> ADD REPLY / MESSAGE</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              placeholder="Write comment..."
                              className="form-control-dark"
                              value={newCommentContent}
                              onChange={(e) => setNewCommentContent(e.target.value)}
                              disabled={commentSubmitting}
                              required
                            />
                          </Form.Group>

                          <div className="d-flex justify-content-between align-items-center">
                            {isAgentOrAdmin ? (
                              <Form.Check
                                type="checkbox"
                                label="🔒 Internal staff note"
                                className="small text-warning font-monospace"
                                checked={isInternalComment}
                                onChange={(e) => setIsInternalComment(e.target.checked)}
                                disabled={commentSubmitting}
                              />
                            ) : <div />}

                            <Button
                              variant="primary"
                              type="submit"
                              size="sm"
                              className="btn-primary-custom px-4 py-2"
                              disabled={commentSubmitting}
                            >
                              {commentSubmitting ? 'Posting...' : 'Post Reply'}
                            </Button>
                          </div>
                        </Form>
                      </Tab.Pane>

                      {/* Audit Log / History Tab */}
                      <Tab.Pane eventKey="history">
                        <h6 className="text-muted small fw-bold mb-3 font-monospace">> TICKET ACTIVITY LOG</h6>
                        {logs.length === 0 ? (
                          <p className="text-muted text-center py-4 font-monospace">> NO ACTIVITY LOGS RECORDED.</p>
                        ) : (
                          <div className="timeline">
                            {logs.map(log => (
                              <div key={log.id} className="timeline-item mb-3 pb-3 border-bottom border-secondary font-monospace" style={{ fontSize: '0.8rem' }}>
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="fw-bold small text-light">{log.action}</span>
                                  <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                    {new Date(log.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-muted small">
                                  Performed by: {log.performedBy.fullName}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Tab.Pane>
                    </>
                  )}
                </Tab.Content>
              </Tab.Container>
            </Offcanvas.Body>
          </>
        )}
      </Offcanvas>

      {/* Create Ticket Modal */}
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        centered
        contentClassName="glass-panel"
        style={{ color: 'white' }}
      >
        <Modal.Header closeButton closeVariant="white" className="border-bottom border-secondary">
          <Modal.Title className="fw-bold font-monospace">> OPEN_NEW_SUPPORT_TICKET</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateTicket}>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="title">
              <Form.Label className="small fw-bold font-monospace">> SUBJECT / TITLE</Form.Label>
              <Form.Control
                type="text"
                placeholder="Brief summary of the issue"
                className="form-control-dark"
                value={newTicket.title}
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                disabled={createSubmitting}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="description">
              <Form.Label className="small fw-bold font-monospace">> DESCRIPTION / DETAILS</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Explain the technical issue or query in detail"
                className="form-control-dark"
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                disabled={createSubmitting}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="priority">
                  <Form.Label className="small fw-bold font-monospace">> PRIORITY LEVEL</Form.Label>
                  <Form.Select
                    className="form-control-dark"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    disabled={createSubmitting}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="category">
                  <Form.Label className="small fw-bold font-monospace">> CATEGORY</Form.Label>
                  <Form.Select
                    className="form-control-dark"
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    disabled={createSubmitting}
                  >
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="BILLING">BILLING</option>
                    <option value="ACCOUNT">ACCOUNT</option>
                    <option value="NETWORK">NETWORK</option>
                    <option value="HR">HR</option>
                    <option value="OTHER">OTHER</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-top border-secondary">
            <Button
              className="btn-outline-custom px-4 py-2"
              onClick={() => setShowCreateModal(false)}
              disabled={createSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="btn-primary-custom px-4 py-2"
              type="submit"
              disabled={createSubmitting}
            >
              {createSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard;
