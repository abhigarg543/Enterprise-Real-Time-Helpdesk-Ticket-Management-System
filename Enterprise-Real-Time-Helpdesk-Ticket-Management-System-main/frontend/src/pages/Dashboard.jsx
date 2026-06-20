import React, { useState, useEffect, useContext, useRef } from 'react';
import { Container, Row, Col, Card, Badge, Table, Button, Modal, Form, Offcanvas, ListGroup, Nav, Tab, Spinner, Alert, ProgressBar } from 'react-bootstrap';
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

  // Sidebar collapsible state and active tab state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('dashboard'); // 'dashboard' | 'tickets' | 'kb' | 'settings'

  // Dedicated Knowledge Base states
  const [kbArticles, setKbArticles] = useState([]);
  const [kbArticlesLoading, setKbArticlesLoading] = useState(false);
  const [kbSearchTerm, setKbSearchTerm] = useState('');

  // Audio system settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.25); // Softened default

  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // AI Copilot draft tone selection state
  const [aiDraftTone, setAiDraftTone] = useState('EMPATHETIC'); // 'EMPATHETIC' | 'PROFESSIONAL' | 'CASUAL'

  // Activity events log feed
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

  // Live Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // CSAT Rating State
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [existingRating, setExistingRating] = useState(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Real-Time KB proposal State (in Ticket draft modal)
  const [kbSuggestions, setKbSuggestions] = useState([]);
  const [expandedKbArticleId, setExpandedKbArticleId] = useState(null);

  // WebSocket Ref
  const stompClientRef = useRef(null);

  // HTML5 Web Audio Synth Engine with settings integration
  const playSynthSound = (type) => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const volMultiplier = soundVolume;

      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.04 * volMultiplier, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'hover') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1600, ctx.currentTime);
        gain.gain.setValueAtTime(0.012 * volMultiplier, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.02);
      } else if (type === 'success') {
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          gain.gain.setValueAtTime(0.025 * volMultiplier, ctx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.25);
        });
      } else if (type === 'notification') {
        const notes = [150, 200];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
          gain.gain.setValueAtTime(0.05 * volMultiplier, ctx.currentTime + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.1);
          osc.stop(ctx.currentTime + i * 0.1 + 0.35);
        });
      }
    } catch (e) {
      console.warn("Synth Audio context error", e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const list = await ticketApi.getNotifications();
      setNotifications(list);
      const unread = list.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  const fetchKbArticles = async () => {
    try {
      setKbArticlesLoading(true);
      const list = await ticketApi.getAllKbArticles();
      setKbArticles(list);
    } catch (e) {
      console.error("Failed to fetch KB articles", e);
    } finally {
      setKbArticlesLoading(false);
    }
  };

  const handleKbSearch = async (val) => {
    setKbSearchTerm(val);
    if (val.trim().length > 2) {
      try {
        setKbArticlesLoading(true);
        const results = await ticketApi.searchKbArticles(val);
        setKbArticles(results);
      } catch (e) {
        console.error(e);
      } finally {
        setKbArticlesLoading(false);
      }
    } else if (val.trim() === '') {
      fetchKbArticles();
    }
  };

  // Redirect to Login if unauthorized
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else {
      fetchDashboardData();
      fetchNotifications();
      connectWebSocket();
    }
    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [currentUser]);

  // Load KB articles when KB tab is active
  useEffect(() => {
    if (activeSidebarTab === 'kb') {
      fetchKbArticles();
    }
  }, [activeSidebarTab]);

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
        debug: () => { },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      stompClient.onConnect = (frame) => {
        stompClientRef.current = stompClient;
        addTerminalLog('WEBSOCKET CONNECTION COMPLETED ON /ws');

        stompClient.subscribe('/topic/dashboard', (msg) => {
          addTerminalLog(`BROADCAST TRIGGER RECEIVED: REFRESHING TICKETS MATRIX`);
          playSynthSound('notification');
          fetchDashboardData(true); // silent refresh
        });

        if (currentUser && currentUser.id) {
          stompClient.subscribe(`/topic/notifications/${currentUser.id}`, (msg) => {
            addTerminalLog(`LIVE IN-APP NOTIFICATION PUSH RECEIVED`);
            playSynthSound('notification');
            fetchNotifications();
          });
        }
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
      playSynthSound('success');
      await fetchDashboardData();
      broadcastUpdate();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create ticket.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleTitleChange = async (val) => {
    setNewTicket({ ...newTicket, title: val });
    if (val.trim().length > 3) {
      try {
        const results = await ticketApi.searchKbArticles(val);
        setKbSuggestions(results);
      } catch (e) {
        console.error(e);
      }
    } else {
      setKbSuggestions([]);
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setRatingSubmitting(true);
    try {
      const saved = await ticketApi.submitCsaRating(selectedTicket.id, ratingScore, ratingFeedback);
      setExistingRating(saved);
      addTerminalLog(`RATING SUBMITTED: ${ratingScore} Stars for Ticket #${selectedTicket.id}`);
      playSynthSound('success');
      fetchDashboardData(true);
    } catch (err) {
      console.error(err);
      alert("Failed to submit rating.");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setDetailsLoading(true);
    setComments([]);
    setLogs([]);
    setExistingRating(null);
    setRatingScore(5);
    setRatingFeedback('');
    addTerminalLog(`OPENING DETAILED VIEW FOR TICKET #${ticket.id}`);
    try {
      const [commentList, logList, rating] = await Promise.all([
        ticketApi.getComments(ticket.id),
        ticketApi.getActivityLogs(ticket.id),
        (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') ? ticketApi.getCsaRating(ticket.id).catch(() => null) : Promise.resolve(null)
      ]);
      setComments(commentList);
      setLogs(logList);
      if (rating) {
        setExistingRating(rating);
      }
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
      playSynthSound('success');
      await fetchDashboardData(true);
      broadcastUpdate();
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
      playSynthSound('success');
      await fetchDashboardData(true);
      broadcastUpdate();
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
      playSynthSound('success');
      broadcastUpdate();
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
      case 'CRITICAL': return <Badge bg="danger" className="px-2 py-1 border border-light animate-pulse-danger">CRITICAL</Badge>;
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
    const matchesStatus = selectedStatusFilter === 'ALL' || 
      t.status === selectedStatusFilter ||
      (selectedStatusFilter === 'UNRESOLVED' && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')) ||
      (selectedStatusFilter === 'RESOLVED_AND_CLOSED' && (t.status === 'RESOLVED' || t.status === 'CLOSED')) ||
      (selectedStatusFilter === 'MY_ASSIGNED' && t.agentId === currentUser?.id);

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  // Dynamic pre-generated AI Copilot draft replies mapping tones
  const getAiDraftResponse = (ticket, tone) => {
    if (!ticket) return '';
    if (tone === 'EMPATHETIC') {
      return `Hi ${ticket.customerName},\n\nI completely understand how frustrating it is to encounter this issue. I am reviewing the details of your request regarding "${ticket.title}" right now, and will work to resolve this as quickly as possible. Thank you for your patience.\n\nBest regards,\n${currentUser.fullName}\nSupport Team`;
    } else if (tone === 'PROFESSIONAL') {
      return `Dear ${ticket.customerName},\n\nThank you for contacting support. Regarding ticket #${ticket.id} ("${ticket.title}"), we have logged your request under the ${ticket.category} category. An engineer has been assigned to analyze the logs and deploy a resolution. We will update you as soon as this is complete.\n\nSincerely,\n${currentUser.fullName}\nSupport Desk`;
    } else {
      return `Hey ${ticket.customerName},\n\nThanks for reaching out! Got your ticket about "${ticket.title}". I'm looking into it now and will get it sorted out for you as soon as I can. Let me know if you need anything else in the meantime!\n\nCheers,\n${currentUser.fullName}`;
    }
  };

  // Pulse skeleton placeholders components
  const StatsSkeleton = () => (
    <Row className="mb-4 g-3">
      <Col lg={8}>
        <Row className="h-100 g-3">
          {[1, 2, 3, 4].map(idx => (
            <Col md={6} key={idx}>
              <Card className="glass-panel h-100 p-3">
                <Card.Body className="d-flex flex-column justify-content-between p-2">
                  <div>
                    <div className="skeleton-box mb-3" style={{ width: '60%', height: '14px' }}></div>
                    <div className="skeleton-box" style={{ width: '35%', height: '38px' }}></div>
                  </div>
                  <div className="mt-4">
                    <div className="skeleton-box" style={{ width: '70%', height: '10px' }}></div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Col>
      <Col lg={4}>
        <Card className="glass-panel h-100 p-3">
          <Card.Body className="d-flex flex-column justify-content-between p-2">
            <div>
              <div className="skeleton-box mb-3" style={{ width: '50%', height: '14px' }}></div>
              <div className="skeleton-box" style={{ width: '100%', height: '120px' }}></div>
            </div>
            <div className="mt-3">
              <div className="skeleton-box" style={{ width: '80%', height: '10px' }}></div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  const TableSkeleton = () => (
    <Table hover responsive className="brutalist-table align-middle mt-3" style={{ '--bs-table-bg': 'transparent' }}>
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
        {[1, 2, 3, 4, 5].map(rowIdx => (
          <tr key={rowIdx}>
            <td className="border-secondary"><div className="skeleton-box" style={{ width: '40px', height: '16px' }}></div></td>
            <td className="border-secondary"><div className="skeleton-box" style={{ width: '80px', height: '16px' }}></div></td>
            <td className="border-secondary">
              <div className="skeleton-box mb-2" style={{ width: '220px', height: '18px' }}></div>
              <div className="skeleton-box" style={{ width: '160px', height: '12px' }}></div>
            </td>
            <td className="border-secondary"><div className="skeleton-box" style={{ width: '90px', height: '16px' }}></div></td>
            <td className="border-secondary"><div className="skeleton-box" style={{ width: '80px', height: '16px' }}></div></td>
            <td className="border-secondary"><div className="skeleton-box" style={{ width: '60px', height: '22px' }}></div></td>
            <td className="border-secondary"><div className="skeleton-box" style={{ width: '70px', height: '22px' }}></div></td>
            <td className="border-secondary text-end"><div className="skeleton-box ms-auto" style={{ width: '50px', height: '16px' }}></div></td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  return (
    <div className="d-flex min-vh-100 ambient-glow-bg" style={{ color: 'var(--text-primary)' }}>
      
      {/* Premium Collapsible Sidebar */}
      <div 
        className="d-flex flex-column border-end"
        style={{
          width: sidebarCollapsed ? '72px' : '260px',
          background: 'var(--bg-card)',
          transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
          borderColor: 'var(--border-color)',
          flexShrink: 0
        }}
      >
        {/* Sidebar Header / Logo */}
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom" style={{ borderColor: 'var(--border-color)', height: '70px' }}>
          {!sidebarCollapsed ? (
            <div className="d-flex align-items-center gap-2">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-violet))', fontSize: '0.9rem' }}
              >
                H
              </div>
              <span className="fw-bold tracking-wider text-dark text-nowrap font-monospace" style={{ fontSize: '0.95rem' }}>HELPDESK_PRO</span>
            </div>
          ) : (
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white mx-auto"
              style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-violet))', fontSize: '0.9rem' }}
            >
              H
            </div>
          )}
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-grow-1 p-2 mt-3">
          <Button
            variant="link"
            className={`sidebar-link w-100 text-start d-flex align-items-center ${activeSidebarTab === 'dashboard' ? 'active' : ''} ${sidebarCollapsed ? 'justify-content-center' : ''}`}
            onClick={() => { playSynthSound('click'); setActiveSidebarTab('dashboard'); }}
            style={{ border: 'none', boxShadow: 'none' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={sidebarCollapsed ? '' : 'me-3'}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            {!sidebarCollapsed && <span className="small">Dashboard</span>}
          </Button>

          <Button
            variant="link"
            className={`sidebar-link w-100 text-start d-flex align-items-center ${activeSidebarTab === 'tickets' ? 'active' : ''} ${sidebarCollapsed ? 'justify-content-center' : ''}`}
            onClick={() => { playSynthSound('click'); setActiveSidebarTab('tickets'); }}
            style={{ border: 'none', boxShadow: 'none' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={sidebarCollapsed ? '' : 'me-3'}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {!sidebarCollapsed && <span className="small">Ticket Registry</span>}
          </Button>

          <Button
            variant="link"
            className={`sidebar-link w-100 text-start d-flex align-items-center ${activeSidebarTab === 'kb' ? 'active' : ''} ${sidebarCollapsed ? 'justify-content-center' : ''}`}
            onClick={() => { playSynthSound('click'); setActiveSidebarTab('kb'); }}
            style={{ border: 'none', boxShadow: 'none' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={sidebarCollapsed ? '' : 'me-3'}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {!sidebarCollapsed && <span className="small">Knowledge Base</span>}
          </Button>

          <Button
            variant="link"
            className={`sidebar-link w-100 text-start d-flex align-items-center ${activeSidebarTab === 'settings' ? 'active' : ''} ${sidebarCollapsed ? 'justify-content-center' : ''}`}
            onClick={() => { playSynthSound('click'); setActiveSidebarTab('settings'); }}
            style={{ border: 'none', boxShadow: 'none' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={sidebarCollapsed ? '' : 'me-3'}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {!sidebarCollapsed && <span className="small">Settings</span>}
          </Button>
        </div>

        {/* Sidebar Footer / Collapse Trigger */}
        <div className="p-2 border-top" style={{ borderColor: 'var(--border-color)' }}>
          <Button
            variant="link"
            className={`sidebar-link w-100 text-start d-flex align-items-center ${sidebarCollapsed ? 'justify-content-center' : ''}`}
            onClick={() => { playSynthSound('click'); setSidebarCollapsed(!sidebarCollapsed); }}
            style={{ border: 'none', boxShadow: 'none' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={sidebarCollapsed ? '' : 'me-3'}>
              {sidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
            {!sidebarCollapsed && <span className="small">Collapse Sidebar</span>}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column overflow-hidden" style={{ minWidth: 0 }}>
        
        {/* Top Navbar */}
        <nav className="glass-panel p-3 d-flex justify-content-between align-items-center mx-3 mt-3" style={{ height: '70px', borderRadius: '12px' }}>
          <div className="d-flex align-items-center">
            <h4 className="m-0 text-gradient fw-bold">HelpDesk Pro Workspace</h4>
            <Badge bg="success" className="ms-3 border border-light small tracking-widest d-none d-sm-inline-block">
              ● ONLINE
            </Badge>
          </div>
          <div className="d-flex align-items-center">
            
            {/* Notification Bell Dropdown */}
            <div className="position-relative me-4" style={{ zIndex: 1050 }}>
              <Button
                variant="link"
                className="p-0 text-dark position-relative"
                onClick={() => { playSynthSound('click'); setShowNotifications(!showNotifications); }}
                style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-bell-fill text-muted hover-light" viewBox="0 0 16 16" style={{ cursor: 'pointer' }}>
                  <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901"/>
                </svg>
                {unreadCount > 0 && (
                  <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle badge-sm" style={{ fontSize: '0.6rem', padding: '0.25em 0.4em' }}>
                    {unreadCount}
                  </Badge>
                )}
              </Button>

              {showNotifications && (
                <div 
                  className="glass-panel position-absolute end-0 mt-3 p-3" 
                  style={{ 
                    width: '320px', 
                    maxHeight: '400px', 
                    overflowY: 'auto', 
                    background: 'var(--bg-card)', 
                    color: 'var(--text-primary)', 
                    borderRadius: '12px', 
                    boxShadow: '0 10px 30px rgba(79, 70, 229, 0.08)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="small fw-bold text-gradient">&gt; NOTIFICATIONS</span>
                    {unreadCount > 0 && (
                      <Button 
                        variant="link" 
                        className="p-0 small text-decoration-none text-info font-monospace" 
                        style={{ fontSize: '0.7rem' }}
                        onClick={async () => {
                          playSynthSound('click');
                          await ticketApi.markAllNotificationsRead();
                          fetchNotifications();
                        }}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="text-muted text-center py-4 small">&gt; No alerts found.</div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className="p-2 mb-1 rounded position-relative" 
                        style={{ 
                          background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                          borderBottom: '1px solid rgba(0,0,0,0.03)',
                          cursor: 'pointer'
                        }}
                        onClick={async () => {
                          playSynthSound('click');
                          if (!n.isRead) {
                            await ticketApi.markNotificationRead(n.id);
                            fetchNotifications();
                          }
                          setShowNotifications(false);
                        }}
                      >
                        <div className="small" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>{n.message}</div>
                        <div className="text-muted font-monospace" style={{ fontSize: '0.6rem', marginTop: '4px' }}>
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <span className="me-3 text-secondary small d-none d-md-inline-block">
              Welcome, <strong className="text-dark">{currentUser?.fullName}</strong> ({roleString})
            </span>
            <Button 
              className="btn-outline-custom btn-sm px-3" 
              onMouseEnter={() => playSynthSound('hover')}
              onClick={() => { playSynthSound('click'); handleLogout(); }}
            >
              Logout
            </Button>
          </div>
        </nav>

        {/* Scrollable View Content */}
        <div className="flex-grow-1 overflow-y-auto p-3 p-md-4">
          {error && <Alert variant="danger" className="mb-4 rounded-3" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', color: '#f43f5e' }}>{error}</Alert>}

          {/* Render Active View tab from Sidebar */}
          {activeSidebarTab === 'dashboard' && (
            <>
              {/* Dynamic Stats Section */}
              {loading ? (
                <StatsSkeleton />
              ) : (
                <Row className="mb-4 g-3">
                  <Col lg={8}>
                    <Row className="h-100 g-3">
                      <Col md={6}>
                        <Card 
                          className="glass-panel brutalist-card-violet h-100 p-3"
                          onMouseEnter={() => playSynthSound('hover')}
                          onClick={() => { playSynthSound('click'); setSelectedStatusFilter('ALL'); }}
                          style={{ 
                            cursor: 'pointer', 
                            border: selectedStatusFilter === 'ALL' ? '1.5px solid var(--primary-color)' : '1.5px solid var(--border-color)',
                            boxShadow: selectedStatusFilter === 'ALL' ? '0 8px 20px rgba(99, 102, 241, 0.12)' : 'none'
                          }}
                        >
                          <Card.Body className="d-flex flex-column justify-content-between p-2">
                            <div>
                              <h6 className="text-muted small fw-bold tracking-widest mb-2 font-monospace">&gt; TOTAL SERVICE VOLUME</h6>
                              <h1 className="text-dark mb-0 fw-bold display-5">{totalCount}</h1>
                            </div>
                            <div className="mt-3">
                              <span className="text-muted small font-monospace" style={{ fontSize: '0.75rem' }}>&gt; db.tickets.count()</span>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card 
                          className="glass-panel brutalist-card-green h-100 p-3"
                          onMouseEnter={() => playSynthSound('hover')}
                          onClick={() => { playSynthSound('click'); setSelectedStatusFilter('UNRESOLVED'); }}
                          style={{ 
                            cursor: 'pointer', 
                            border: selectedStatusFilter === 'UNRESOLVED' ? '1.5px solid var(--accent-amber)' : '1.5px solid var(--border-color)',
                            boxShadow: selectedStatusFilter === 'UNRESOLVED' ? '0 8px 20px rgba(245, 158, 11, 0.12)' : 'none'
                          }}
                        >
                          <Card.Body className="d-flex flex-column justify-content-between p-2">
                            <div>
                              <h6 className="text-muted small fw-bold tracking-widest mb-2 font-monospace">&gt; ACTIVE UNRESOLVED</h6>
                              <h1 className="text-warning mb-0 fw-bold display-5">{openCount}</h1>
                            </div>
                            <div className="mt-3">
                              <span className="text-muted small font-monospace" style={{ fontSize: '0.75rem' }}>&gt; db.tickets.filter(active)</span>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card 
                          className="glass-panel brutalist-card-green h-100 p-3"
                          onMouseEnter={() => playSynthSound('hover')}
                          onClick={() => { playSynthSound('click'); setSelectedStatusFilter('RESOLVED_AND_CLOSED'); }}
                          style={{ 
                            cursor: 'pointer', 
                            border: selectedStatusFilter === 'RESOLVED_AND_CLOSED' ? '1.5px solid var(--accent-green)' : '1.5px solid var(--border-color)',
                            boxShadow: selectedStatusFilter === 'RESOLVED_AND_CLOSED' ? '0 8px 20px rgba(16, 185, 129, 0.12)' : 'none'
                          }}
                        >
                          <Card.Body className="d-flex flex-column justify-content-between p-2">
                            <div>
                              <h6 className="text-muted small fw-bold tracking-widest mb-2 font-monospace">&gt; RESOLVED ACTIONS</h6>
                              <h1 className="text-success mb-0 fw-bold display-5">{resolvedCount}</h1>
                            </div>
                            <div className="mt-3">
                              <span className="text-muted small font-monospace" style={{ fontSize: '0.75rem' }}>&gt; Target: 98.4% Achieved</span>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card 
                          className="glass-panel brutalist-card-violet h-100 p-3"
                          onMouseEnter={() => playSynthSound('hover')}
                          onClick={() => { playSynthSound('click'); setSelectedStatusFilter('MY_ASSIGNED'); }}
                          style={{ 
                            cursor: 'pointer', 
                            border: selectedStatusFilter === 'MY_ASSIGNED' ? '1.5px solid var(--accent-cyan)' : '1.5px solid var(--border-color)',
                            boxShadow: selectedStatusFilter === 'MY_ASSIGNED' ? '0 8px 20px rgba(6, 182, 212, 0.12)' : 'none'
                          }}
                        >
                          <Card.Body className="d-flex flex-column justify-content-between p-2">
                            <div>
                              <h6 className="text-muted small fw-bold tracking-widest mb-2 font-monospace">
                                &gt; {isAgentOrAdmin ? 'MY ASSIGNED QUEUE' : 'MY ACTIVE SUBMISSIONS'}
                              </h6>
                              <h1 className="text-info mb-0 fw-bold display-5">
                                {isAgentOrAdmin ? myAssignedCount : openCount}
                              </h1>
                            </div>
                            <div className="mt-3">
                              <span className="text-muted small font-monospace" style={{ fontSize: '0.75rem' }}>&gt; Load: Normal</span>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </Col>

                  {/* SVG Analytics and CSAT Metrics Card */}
                  <Col lg={4}>
                    <Card className="glass-panel h-100 p-3" onMouseEnter={() => playSynthSound('hover')}>
                      <Card.Body className="d-flex flex-column justify-content-between p-2">
                        <div>
                          <h6 className="text-muted small fw-bold tracking-widest mb-3 font-monospace">&gt; ANALYTICS OVERVIEW</h6>
                          <div className="d-flex justify-content-around align-items-center py-2 flex-wrap gap-2">
                            <svg width="150" height="100" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                              <rect x="15" y={85 - Math.min(65, (openCount / (totalCount || 1)) * 65)} width="18" height={Math.min(65, (openCount / (totalCount || 1)) * 65)} fill="var(--accent-amber)" rx="2" />
                              <text x="14" y="94" fill="var(--text-muted)" fontSize="7" fontFamily="var(--font-mono)">OPEN</text>
                              
                              <rect x="65" y={85 - Math.min(65, (resolvedCount / (totalCount || 1)) * 65)} width="18" height={Math.min(65, (resolvedCount / (totalCount || 1)) * 65)} fill="var(--accent-green)" rx="2" />
                              <text x="61" y="94" fill="var(--text-muted)" fontSize="7" fontFamily="var(--font-mono)">SOLVED</text>
                              
                              <rect x="115" y="20" width="18" height="65" fill="var(--primary-color)" rx="2" />
                              <text x="112" y="94" fill="var(--text-muted)" fontSize="7" fontFamily="var(--font-mono)">TOTAL</text>
                            </svg>

                            <div className="small font-monospace text-muted" style={{ fontSize: '0.75rem' }}>
                              <div><strong className="text-warning">■</strong> Open: {openCount}</div>
                              <div className="mt-1"><strong className="text-success">■</strong> Solved: {resolvedCount}</div>
                              <div className="mt-1"><strong style={{ color: 'var(--primary-color)' }}>■</strong> Total: {totalCount}</div>
                            </div>
                          </div>
                        </div>

                        {/* Visual CSAT Satisfaction Distribution Widget */}
                        <div className="border-top pt-3 mt-3" style={{ borderColor: 'var(--border-color)' }}>
                          <h6 className="text-muted small fw-bold tracking-widest mb-2 font-monospace">&gt; CSAT METRICS FEEDBACK</h6>
                          <div className="d-flex align-items-center gap-3 my-2">
                            <h3 className="text-dark fw-bold m-0">4.8</h3>
                            <div>
                              <div className="text-warning" style={{ fontSize: '1rem', lineHeight: '1' }}>★★★★★</div>
                              <div className="text-muted font-monospace" style={{ fontSize: '0.65rem' }}>Based on client ratings</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.75rem' }} className="text-secondary mt-2">
                            <div className="mb-2">
                              <div className="d-flex justify-content-between mb-1">
                                <span>Excellent (5★)</span>
                                <span className="fw-bold">85%</span>
                              </div>
                              <ProgressBar now={85} variant="success" style={{ height: '4px' }} />
                            </div>
                            <div>
                              <div className="d-flex justify-content-between mb-1">
                                <span>Good (4★)</span>
                                <span className="fw-bold">12%</span>
                              </div>
                              <ProgressBar now={12} variant="info" style={{ height: '4px' }} />
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              {/* Filtering Controls Bar */}
              <Row className="mb-4">
                <Col>
                  <div className="glass-panel p-3 d-flex flex-wrap gap-3 align-items-center justify-content-between">
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      <Form.Control
                        type="text"
                        placeholder="SEARCH SUBMISSIONS..."
                        className="form-control-dark py-2 px-3 small font-monospace"
                        style={{ width: '250px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={() => playSynthSound('click')}
                      />

                      {/* Category Filter */}
                      <Form.Select
                        className="form-control-dark py-2 px-3 small font-monospace"
                        style={{ width: '150px' }}
                        value={selectedCategoryFilter}
                        onChange={(e) => { playSynthSound('click'); setSelectedCategoryFilter(e.target.value); }}
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
                        onChange={(e) => { playSynthSound('click'); setSelectedPriorityFilter(e.target.value); }}
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
                        onChange={(e) => { playSynthSound('click'); setSelectedStatusFilter(e.target.value); }}
                      >
                        <option value="ALL">ALL STATUSES</option>
                        <option value="UNRESOLVED">ACTIVE UNRESOLVED</option>
                        <option value="RESOLVED_AND_CLOSED">RESOLVED & CLOSED</option>
                        <option value="MY_ASSIGNED">MY ASSIGNED</option>
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
                        onMouseEnter={() => playSynthSound('hover')}
                        onClick={() => { playSynthSound('click'); setShowCreateModal(true); }}
                      >
                        + Create Ticket
                      </Button>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Tickets Registry Matrix & logs feed */}
              <Row className="g-4">
                <Col lg={9}>
                  <Card className="glass-panel border-0">
                    <Card.Header className="bg-transparent border-0 pt-4 pb-0 d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--border-color)' }}>
                      <h5 className="text-dark m-0 tracking-widest fw-bold">&gt; TICKET MATRIX</h5>
                      <span className="text-muted small font-monospace">Showing {filteredTickets.length} items</span>
                    </Card.Header>
                    <Card.Body className="p-3">
                      {loading ? (
                        <TableSkeleton />
                      ) : filteredTickets.length === 0 ? (
                        <div className="text-center py-5 text-muted font-monospace">
                          <p className="mb-0">&gt; RECORD NOT FOUND WITH CURRENT PARAMETERS.</p>
                        </div>
                      ) : (
                        <Table hover responsive className="brutalist-table align-middle mt-3" style={{ '--bs-table-bg': 'transparent', '--bs-table-hover-bg': 'rgba(79, 70, 229, 0.015)' }}>
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
                              <tr 
                                key={t.id} 
                                style={{ cursor: 'pointer' }} 
                                onMouseEnter={() => playSynthSound('hover')}
                                onClick={() => { playSynthSound('click'); handleSelectTicket(t); }}
                              >
                                <td className="border-secondary text-muted font-monospace">#{t.id}</td>
                                <td className="border-secondary text-muted small">{t.category}</td>
                                <td className="border-secondary">
                                  <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <span className="fw-bold text-dark">{t.title}</span>
                                    {t.slaDueDate && (
                                      <span style={{ fontSize: '0.65rem' }}>
                                        {t.status === 'RESOLVED' || t.status === 'CLOSED' ? (
                                          <Badge bg="secondary" style={{ opacity: 0.7 }}>SLA DONE</Badge>
                                        ) : (
                                          (() => {
                                            const diff = new Date(t.slaDueDate) - new Date();
                                            if (diff < 0) return <Badge bg="danger" className="animate-pulse text-white">SLA BREACHED</Badge>;
                                            const hours = Math.floor(diff / 3600000);
                                            const mins = Math.floor((diff % 3600000) / 60000);
                                            return <Badge bg={hours < 1 ? 'danger' : hours < 4 ? 'warning' : 'info'}>{hours}h {mins}m</Badge>;
                                          })()
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-muted small text-truncate" style={{ maxWidth: '240px' }}>{t.description}</div>
                                  
                                  {/* Visual SLA Progress Bar */}
                                  {t.slaDueDate && t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (
                                    <div className="mt-2" style={{ width: '140px' }}>
                                      {(() => {
                                        const diff = new Date(t.slaDueDate) - new Date();
                                        const totalSla = 24 * 3600000;
                                        const percentage = Math.max(0, Math.min(100, (diff / totalSla) * 100));
                                        const barColor = diff < 0 ? 'bg-danger' : percentage < 25 ? 'bg-danger' : percentage < 50 ? 'bg-warning' : 'bg-success';
                                        return (
                                          <div className="progress" style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px' }}>
                                            <div className={`progress-bar ${barColor}`} style={{ width: `${percentage}%` }}></div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </td>
                                <td className="border-secondary small text-secondary">{t.customerName}</td>
                                <td className="border-secondary small text-info font-semibold">
                                  {t.agentName || <span className="text-muted italic small">Unassigned</span>}
                                </td>
                                <td className="border-secondary">{getPriorityBadge(t.priority)}</td>
                                <td className="border-secondary">{getStatusBadge(t.status)}</td>
                                <td className="border-secondary text-end">
                                  <Button
                                    variant="link"
                                    className="text-primary text-decoration-none p-0 fw-bold"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      playSynthSound('click');
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

                {/* Right hand Agent Load and Logs Timeline Panel */}
                <Col lg={3}>
                  
                  {/* Agent Workload Tracker */}
                  <Card className="glass-panel mb-4 p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                      <span className="text-primary small fw-bold tracking-wider">&gt; AGENTS WORKLOAD</span>
                      <Badge bg="light" className="text-primary small font-monospace">Auto-Assign</Badge>
                    </div>
                    <div className="small text-secondary overflow-y-auto mb-1" style={{ maxHeight: '180px' }}>
                      {agents.length === 0 ? (
                        <div className="text-muted text-center py-2">No agents seeded.</div>
                      ) : (
                        agents.map(a => {
                          const agentWorkload = tickets.filter(t => t.agentId === a.id && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
                          return (
                            <div key={a.id} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded bg-light border border-light">
                              <div className="d-flex align-items-center gap-2">
                                <div 
                                  className="rounded-circle d-flex align-items-center justify-content-center text-white font-semibold"
                                  style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-blue))', fontSize: '0.75rem' }}
                                >
                                  {a.fullName.charAt(0)}
                                </div>
                                <div className="text-dark fw-bold" style={{ fontSize: '0.75rem' }}>{a.fullName}</div>
                              </div>
                              <Badge bg={agentWorkload > 3 ? 'danger' : agentWorkload > 1 ? 'warning' : 'success'} className="font-monospace">
                                {agentWorkload} Tickets
                              </Badge>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Card>

                  {/* Clean Visual Event Timeline Feed */}
                  <Card className="glass-panel p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                      <span className="text-primary small fw-bold tracking-wider">&gt; TIMELINE EVENT LOG</span>
                      <Badge bg="light" className="text-secondary small">Live</Badge>
                    </div>

                    <div
                      className="overflow-y-auto mb-2 timeline-container"
                      style={{ height: '200px' }}
                    >
                      {terminalLogs.map((log, i) => {
                        const timeMatch = log.match(/^\[(.*?)\]\s*&gt;\s*(.*)/) || log.match(/^\[(.*?)\]\s*>\s*(.*)/);
                        return (
                          <div key={i} className="timeline-item-block mb-3">
                            <div className="timeline-point"></div>
                            <div className="d-flex flex-column" style={{ paddingLeft: '8px' }}>
                              <span className="text-muted font-monospace" style={{ fontSize: '0.65rem' }}>
                                {timeMatch ? timeMatch[1] : 'Log event'}
                              </span>
                              <span className="text-secondary font-semibold text-wrap" style={{ wordBreak: 'break-word', fontSize: '0.75rem', marginTop: '2px' }}>
                                {timeMatch ? timeMatch[2] : log}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </Col>
              </Row>
            </>
          )}

          {activeSidebarTab === 'tickets' && (
            <div className="h-100">
              <div className="mb-4">
                <h4 className="fw-bold m-0 text-gradient">&gt; TICKET DATABASE</h4>
                <p className="text-muted small m-0 mt-1">Full index database of all technical support submissions and assignments.</p>
              </div>

              {/* Filtering Controls Bar */}
              <Row className="mb-4">
                <Col>
                  <div className="glass-panel p-3 d-flex flex-wrap gap-3 align-items-center justify-content-between">
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      <Form.Control
                        type="text"
                        placeholder="SEARCH SUBMISSIONS..."
                        className="form-control-dark py-2 px-3 small font-monospace"
                        style={{ width: '250px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={() => playSynthSound('click')}
                      />

                      {/* Category Filter */}
                      <Form.Select
                        className="form-control-dark py-2 px-3 small font-monospace"
                        style={{ width: '150px' }}
                        value={selectedCategoryFilter}
                        onChange={(e) => { playSynthSound('click'); setSelectedCategoryFilter(e.target.value); }}
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
                        onChange={(e) => { playSynthSound('click'); setSelectedPriorityFilter(e.target.value); }}
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
                        onChange={(e) => { playSynthSound('click'); setSelectedStatusFilter(e.target.value); }}
                      >
                        <option value="ALL">ALL STATUSES</option>
                        <option value="UNRESOLVED">ACTIVE UNRESOLVED</option>
                        <option value="RESOLVED_AND_CLOSED">RESOLVED & CLOSED</option>
                        <option value="MY_ASSIGNED">MY ASSIGNED</option>
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
                        onMouseEnter={() => playSynthSound('hover')}
                        onClick={() => { playSynthSound('click'); setShowCreateModal(true); }}
                      >
                        + Create Ticket
                      </Button>
                    </div>
                  </div>
                </Col>
              </Row>

              <Card className="glass-panel border-0">
                <Card.Header className="bg-transparent border-0 pt-4 pb-0 d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--border-color)' }}>
                  <h5 className="text-dark m-0 tracking-widest fw-bold">&gt; DATABASE RECORDS</h5>
                  <span className="text-muted small font-monospace">Showing {filteredTickets.length} items</span>
                </Card.Header>
                <Card.Body className="p-3">
                  {loading ? (
                    <TableSkeleton />
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-5 text-muted font-monospace">
                      <p className="mb-0">&gt; RECORD NOT FOUND WITH CURRENT PARAMETERS.</p>
                    </div>
                  ) : (
                    <Table hover responsive className="brutalist-table align-middle mt-3" style={{ '--bs-table-bg': 'transparent', '--bs-table-hover-bg': 'rgba(79, 70, 229, 0.015)' }}>
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
                          <tr 
                            key={t.id} 
                            style={{ cursor: 'pointer' }} 
                            onMouseEnter={() => playSynthSound('hover')}
                            onClick={() => { playSynthSound('click'); handleSelectTicket(t); }}
                          >
                            <td className="border-secondary text-muted font-monospace">#{t.id}</td>
                            <td className="border-secondary text-muted small">{t.category}</td>
                            <td className="border-secondary">
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <span className="fw-bold text-dark">{t.title}</span>
                                {t.slaDueDate && (
                                  <span style={{ fontSize: '0.65rem' }}>
                                    {t.status === 'RESOLVED' || t.status === 'CLOSED' ? (
                                      <Badge bg="secondary" style={{ opacity: 0.7 }}>SLA DONE</Badge>
                                    ) : (
                                      (() => {
                                        const diff = new Date(t.slaDueDate) - new Date();
                                        if (diff < 0) return <Badge bg="danger" className="animate-pulse text-white">SLA BREACHED</Badge>;
                                        const hours = Math.floor(diff / 3600000);
                                        const mins = Math.floor((diff % 3600000) / 60000);
                                        return <Badge bg={hours < 1 ? 'danger' : hours < 4 ? 'warning' : 'info'}>{hours}h {mins}m</Badge>;
                                      })()
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className="text-muted small text-truncate" style={{ maxWidth: '340px' }}>{t.description}</div>
                              
                              {/* Visual SLA Progress Bar */}
                              {t.slaDueDate && t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (
                                <div className="mt-2" style={{ width: '140px' }}>
                                  {(() => {
                                    const diff = new Date(t.slaDueDate) - new Date();
                                    const totalSla = 24 * 3600000;
                                    const percentage = Math.max(0, Math.min(100, (diff / totalSla) * 100));
                                    const barColor = diff < 0 ? 'bg-danger' : percentage < 25 ? 'bg-danger' : percentage < 50 ? 'bg-warning' : 'bg-success';
                                    return (
                                      <div className="progress" style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px' }}>
                                        <div className={`progress-bar ${barColor}`} style={{ width: `${percentage}%` }}></div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </td>
                            <td className="border-secondary small text-secondary">{t.customerName}</td>
                            <td className="border-secondary small text-info font-semibold">
                              {t.agentName || <span className="text-muted italic small">Unassigned</span>}
                            </td>
                            <td className="border-secondary">{getPriorityBadge(t.priority)}</td>
                            <td className="border-secondary">{getStatusBadge(t.status)}</td>
                            <td className="border-secondary text-end">
                              <Button
                                variant="link"
                                className="text-primary text-decoration-none p-0 fw-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playSynthSound('click');
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
            </div>
          )}

          {activeSidebarTab === 'kb' && (
            <div className="glass-panel p-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                  <h4 className="fw-bold m-0 text-gradient">&gt; KNOWLEDGE BASE CENTRAL</h4>
                  <p className="text-muted small m-0 mt-1">Access self-help resources and resolution articles.</p>
                </div>
                <div style={{ width: '320px' }}>
                  <Form.Control
                    type="text"
                    placeholder="SEARCH KB ARTICLES..."
                    className="form-control-dark font-monospace"
                    value={kbSearchTerm}
                    onChange={(e) => handleKbSearch(e.target.value)}
                    onKeyDown={() => playSynthSound('click')}
                  />
                </div>
              </div>

              {kbArticlesLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="text-muted mt-3">Searching Knowledge Base...</p>
                </div>
              ) : kbArticles.length === 0 ? (
                <div className="text-center py-5 text-muted font-monospace">
                  <p className="mb-0">&gt; NO ARTICLES MATCHED YOUR SEARCH TERM.</p>
                </div>
              ) : (
                <Row className="g-3">
                  {kbArticles.map(article => (
                    <Col md={6} lg={4} key={article.id}>
                      <Card className="glass-panel h-100 p-3" style={{ border: '1px solid var(--border-color)' }}>
                        <Card.Body className="d-flex flex-column h-100 justify-content-between p-0">
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <Badge bg="info" className="text-dark small uppercase tracking-wider">{article.category || 'GENERAL'}</Badge>
                              <span className="text-muted font-monospace" style={{ fontSize: '0.7rem' }}>#{article.id}</span>
                            </div>
                            <h5 className="text-dark fw-bold mb-3">{article.title}</h5>
                            <p 
                              className="text-secondary small" 
                              style={{ 
                                fontSize: '0.8rem', 
                                lineHeight: '1.5', 
                                whiteSpace: 'pre-wrap', 
                                maxHeight: '120px', 
                                overflowY: 'auto'
                              }}
                            >
                              {article.content}
                            </p>
                          </div>
                          <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--border-color)' }}>
                            <span className="text-muted font-monospace" style={{ fontSize: '0.65rem' }}>Updated: 24h ago</span>
                            <Button 
                              variant="link" 
                              className="p-0 text-info text-decoration-none small fw-bold"
                              onClick={() => {
                                playSynthSound('click');
                                alert(`Article #${article.id}: ${article.title}\n\n${article.content}`);
                              }}
                            >
                              View Full &rarr;
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          )}

          {activeSidebarTab === 'settings' && (
            <div className="glass-panel p-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h4 className="fw-bold mb-4 text-gradient">&gt; SYSTEM SETTINGS</h4>
              
              <Card className="glass-panel border-0 p-3 mb-4" style={{ border: '1px solid var(--border-color)' }}>
                <h5 className="text-dark fw-bold mb-3">Sound &amp; Haptics</h5>
                <Form.Group className="mb-3 d-flex align-items-center justify-content-between">
                  <div>
                    <Form.Label className="m-0 fw-bold text-dark">Enable Interactive Sound Effects</Form.Label>
                    <div className="text-muted small">Play frequencies on hover, click, success, and notifications.</div>
                  </div>
                  <Form.Check 
                    type="switch"
                    id="sound-switch"
                    checked={soundEnabled}
                    onChange={(e) => { setSoundEnabled(e.target.checked); playSynthSound('click'); }}
                    className="custom-switch"
                  />
                </Form.Group>

                {soundEnabled && (
                  <Form.Group className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <Form.Label className="m-0 fw-bold small text-muted">Volume</Form.Label>
                      <span className="small text-info font-monospace">{Math.round(soundVolume * 100)}%</span>
                    </div>
                    <Form.Range 
                      min="0.1" 
                      max="1.0" 
                      step="0.05"
                      value={soundVolume}
                      onChange={(e) => { setSoundVolume(parseFloat(e.target.value)); }}
                    />
                  </Form.Group>
                )}

                <div className="d-flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    className="btn-outline-custom"
                    onClick={() => playSynthSound('click')}
                    disabled={!soundEnabled}
                  >
                    Test Click
                  </Button>
                  <Button 
                    size="sm" 
                    className="btn-outline-custom"
                    onClick={() => playSynthSound('success')}
                    disabled={!soundEnabled}
                  >
                    Test Success Notes
                  </Button>
                  <Button 
                    size="sm" 
                    className="btn-outline-custom"
                    onClick={() => playSynthSound('notification')}
                    disabled={!soundEnabled}
                  >
                    Test Notification Ring
                  </Button>
                </div>
              </Card>

              <Card className="glass-panel border-0 p-3 mb-4" style={{ border: '1px solid var(--border-color)' }}>
                <h5 className="text-dark fw-bold mb-3">User Profile Identity</h5>
                <div className="d-flex align-items-center gap-3">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                    style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-violet))', fontSize: '1.5rem' }}
                  >
                    {currentUser?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h6 className="m-0 fw-bold text-dark" style={{ fontSize: '1.1rem' }}>{currentUser?.fullName}</h6>
                    <div className="text-muted small mt-1 font-monospace">{currentUser?.email}</div>
                    <div className="mt-2">
                      <Badge bg="dark" className="border border-secondary tracking-widest text-gradient uppercase">{roleString}</Badge>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="glass-panel border-0 p-3" style={{ border: '1px solid var(--border-color)' }}>
                <h5 className="text-dark fw-bold mb-2">About HelpDesk Pro</h5>
                <div className="text-muted small font-monospace" style={{ fontSize: '0.8rem', lineHeight: '1.6' }}>
                  <div>App Version: 2.4.0 (Enterprise Suite)</div>
                  <div>Spring Boot Backend: 4.0.6 (Embedded Tomcat on Port 8080)</div>
                  <div>Real-Time Engine: WebSockets (STOMP Client)</div>
                  <div>Redesigned Platform UI: Active Cheerful Light-Theme</div>
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>

      {/* Slide-Out Ticket Management Sidebar */}
      <Offcanvas
        show={selectedTicket !== null}
        onHide={() => setSelectedTicket(null)}
        placement="end"
        style={{ width: '600px', background: 'var(--bg-card)', borderLeft: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
      >
        {selectedTicket && (
          <>
            <Offcanvas.Header closeButton closeVariant="dark" className="border-bottom" style={{ borderColor: 'var(--border-color)' }}>
              <Offcanvas.Title className="fw-bold font-monospace">
                TICKET DETAILS <span className="text-muted small">#{selectedTicket.id}</span>
              </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body className="p-0">
              <Tab.Container defaultActiveKey="overview">
                <Nav className="nav-tabs-dark border-bottom px-3" style={{ borderColor: 'var(--border-color)' }}>
                  <Nav.Item>
                    <Nav.Link 
                      eventKey="overview" 
                      className="px-4 py-3"
                      onMouseEnter={() => playSynthSound('hover')}
                      onClick={() => playSynthSound('click')}
                    >
                      Overview
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      eventKey="comments" 
                      className="px-4 py-3 position-relative"
                      onMouseEnter={() => playSynthSound('hover')}
                      onClick={() => playSynthSound('click')}
                    >
                      Comments &amp; Notes
                      {comments.length > 0 && (
                        <Badge bg="primary" className="ms-2 small">{comments.length}</Badge>
                      )}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      eventKey="history" 
                      className="px-4 py-3"
                      onMouseEnter={() => playSynthSound('hover')}
                      onClick={() => playSynthSound('click')}
                    >
                      Audit Logs
                    </Nav.Link>
                  </Nav.Item>
                </Nav>

                <Tab.Content className="p-4" style={{ height: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                  {detailsLoading ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                    </div>
                  ) : (
                    <>
                      {/* Overview Tab */}
                      <Tab.Pane eventKey="overview">
                        <div className="mb-4">
                          <h4 className="fw-bold mb-2 text-dark">{selectedTicket.title}</h4>
                          <div className="d-flex gap-2 align-items-center mb-3 flex-wrap">
                            {getStatusBadge(selectedTicket.status)}
                            {getPriorityBadge(selectedTicket.priority)}
                            <Badge bg="light" className="text-dark border border-secondary">{selectedTicket.category}</Badge>
                            {selectedTicket.slaDueDate && (
                              <span style={{ fontSize: '0.8rem' }}>
                                {selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED' ? (
                                  <Badge bg="secondary" className="border border-secondary">SLA COMPLETED</Badge>
                                ) : (
                                  (() => {
                                    const diff = new Date(selectedTicket.slaDueDate) - new Date();
                                    if (diff < 0) return <Badge bg="danger" className="animate-pulse text-white border border-light">SLA BREACHED</Badge>;
                                    const hours = Math.floor(diff / 3600000);
                                    const mins = Math.floor((diff % 3600000) / 60000);
                                    return <Badge bg={hours < 1 ? 'danger' : hours < 4 ? 'warning' : 'info'}>SLA: {hours}h {mins}m remaining</Badge>;
                                  })()
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        <Card className="glass-panel border-0 mb-4 p-3" style={{ border: '1px solid var(--border-color)' }}>
                          <h6 className="text-muted small fw-bold mb-2 font-monospace">&gt; DESCRIPTION</h6>
                          <p className="text-secondary mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                            {selectedTicket.description}
                          </p>
                        </Card>

                        {/* Metadata Details */}
                        <div className="glass-panel p-3 mb-4 rounded-3" style={{ border: '1px solid var(--border-color)' }}>
                          <Row className="mb-3">
                            <Col xs={4} className="text-muted small fw-bold font-monospace">&gt; OWNER</Col>
                            <Col xs={8} className="small text-dark">{selectedTicket.customerName}</Col>
                          </Row>
                          <Row className="mb-3 align-items-center">
                            <Col xs={4} className="text-muted small fw-bold font-monospace">&gt; ASSIGNEE</Col>
                            <Col xs={8}>
                              {isAgentOrAdmin ? (
                                <Form.Select
                                  size="sm"
                                  className="form-control-dark"
                                  value={selectedTicket.agentId || ''}
                                  onChange={(e) => { playSynthSound('click'); handleAgentAssignment(selectedTicket.id, e.target.value); }}
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
                            <Col xs={4} className="text-muted small fw-bold font-monospace">&gt; STATUS</Col>
                            <Col xs={8}>
                              <Form.Select
                                size="sm"
                                className="form-control-dark"
                                value={selectedTicket.status}
                                onChange={(e) => { playSynthSound('click'); handleStatusChange(selectedTicket.id, e.target.value); }}
                              >
                                <option value="OPEN">OPEN</option>
                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                <option value="WAITING_FOR_CUSTOMER">WAITING FOR CUSTOMER</option>
                                <option value="RESOLVED">RESOLVED</option>
                                <option value="CLOSED">CLOSED</option>
                              </Form.Select>
                            </Col>
                          </Row>
                          <Row className="mb-3">
                            <Col xs={4} className="text-muted small fw-bold font-monospace">&gt; CREATED ON</Col>
                            <Col xs={8} className="small text-muted font-monospace">
                              {new Date(selectedTicket.createdAt).toLocaleString()}
                            </Col>
                          </Row>
                          {selectedTicket.aiSentiment && (
                            <Row className="mb-3">
                              <Col xs={4} className="text-muted small fw-bold font-monospace">&gt; AI TRIAGE</Col>
                              <Col xs={8} className="small">
                                <Badge bg={selectedTicket.aiSentiment === 'NEGATIVE' ? 'danger' : selectedTicket.aiSentiment === 'POSITIVE' ? 'success' : 'secondary'} className="me-2">
                                  SENTIMENT: {selectedTicket.aiSentiment}
                                </Badge>
                                {selectedTicket.slaBreached && (
                                  <Badge bg="danger" className="text-white">SLA BREACHED</Badge>
                                )}
                              </Col>
                            </Row>
                          )}
                        </div>

                        {/* CSAT Rating Widget */}
                        {(selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') && (
                          <>
                            {existingRating ? (
                              <Card className="glass-panel border-0 mb-4 p-3 brutalist-card-green" style={{ border: '1px solid var(--accent-green)' }}>
                                <h6 className="text-success small fw-bold mb-2 font-monospace">&gt; CUSTOMER SATISFACTION REVIEW</h6>
                                <div className="d-flex align-items-center mb-2">
                                  <span className="text-warning fw-bold me-2" style={{ fontSize: '1.2rem' }}>
                                    {"★".repeat(existingRating.score)}{"☆".repeat(5 - existingRating.score)}
                                  </span>
                                  <span className="small text-dark font-monospace">({existingRating.score} / 5)</span>
                                </div>
                                {existingRating.feedback && (
                                  <p className="text-muted small mb-0 font-monospace" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                                    "{existingRating.feedback}"
                                  </p>
                                )}
                              </Card>
                            ) : (
                              !isAgentOrAdmin && (
                                <Card className="glass-panel border-0 mb-4 p-3" style={{ border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                  <h6 className="text-warning small fw-bold mb-2 font-monospace">&gt; RATE OUR SERVICE (CSAT)</h6>
                                  <Form onSubmit={handleRatingSubmit}>
                                    <div className="d-flex align-items-center mb-3">
                                      <span className="text-muted small me-3 font-monospace">Score:</span>
                                      {[1, 2, 3, 4, 5].map((val) => (
                                        <span
                                          key={val}
                                          onClick={() => { playSynthSound('click'); setRatingScore(val); }}
                                          style={{ cursor: 'pointer', fontSize: '1.4rem', color: val <= ratingScore ? '#ffc107' : '#e2e8f0', transition: 'color 0.15s' }}
                                          className="me-1"
                                        >
                                          ★
                                        </span>
                                      ))}
                                    </div>
                                    <Form.Group className="mb-3">
                                      <Form.Control
                                        type="text"
                                        placeholder="Add optional feedback comment..."
                                        className="form-control-dark py-1 px-2 small text-dark"
                                        style={{ fontSize: '0.85rem' }}
                                        value={ratingFeedback}
                                        onChange={(e) => setRatingFeedback(e.target.value)}
                                      />
                                    </Form.Group>
                                    <Button 
                                      type="submit" 
                                      size="sm" 
                                      className="btn-primary-custom w-100" 
                                      disabled={ratingSubmitting}
                                    >
                                      {ratingSubmitting ? 'Submitting...' : 'Submit CSAT Review'}
                                    </Button>
                                  </Form>
                                </Card>
                              )
                            )}
                          </>
                        )}
                      </Tab.Pane>

                      {/* Comments & Notes Tab */}
                      <Tab.Pane eventKey="comments">
                        
                        {/* Interactive AI Agent Copilot Card */}
                        <Card className="p-3 mb-3 border border-info rounded-3" style={{ background: 'rgba(6, 182, 212, 0.035)', border: '1px solid rgba(6, 182, 212, 0.15) !important' }}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="small fw-bold text-info font-monospace">&gt; AI AGENT COPILOT</span>
                            <Badge bg="info" className="text-dark">Copilot Active</Badge>
                          </div>
                          
                          {/* Sentiment / Frustration Meter */}
                          <div className="mb-3 p-2 rounded bg-white border border-light">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="small text-secondary" style={{ fontSize: '0.75rem' }}>Customer Frustration Level:</span>
                              <span className={`small fw-bold text-${selectedTicket.aiSentiment === 'NEGATIVE' ? 'danger' : selectedTicket.aiSentiment === 'POSITIVE' ? 'success' : 'warning'}`} style={{ fontSize: '0.75rem' }}>
                                {selectedTicket.aiSentiment === 'NEGATIVE' ? 'High (8/10)' : selectedTicket.aiSentiment === 'POSITIVE' ? 'Low (2/10)' : 'Neutral (4/10)'}
                              </span>
                            </div>
                            <ProgressBar 
                              now={selectedTicket.aiSentiment === 'NEGATIVE' ? 80 : selectedTicket.aiSentiment === 'POSITIVE' ? 20 : 40} 
                              variant={selectedTicket.aiSentiment === 'NEGATIVE' ? 'danger' : selectedTicket.aiSentiment === 'POSITIVE' ? 'success' : 'warning'} 
                              style={{ height: '4px' }} 
                            />
                          </div>

                          {/* Tone Selectors */}
                          <div className="d-flex gap-1 mb-3 flex-wrap">
                            <span className="small text-muted align-self-center me-2" style={{ fontSize: '0.75rem' }}>Tone:</span>
                            <Button 
                              size="sm" 
                              variant={aiDraftTone === 'EMPATHETIC' ? 'info' : 'outline-light'}
                              className={`py-1 px-2 text-dark text-nowrap rounded-pill ${aiDraftTone === 'EMPATHETIC' ? 'fw-bold' : 'text-secondary'}`}
                              style={{ fontSize: '0.7rem' }}
                              onClick={() => { playSynthSound('click'); setAiDraftTone('EMPATHETIC'); }}
                            >
                              🤝 Empathetic
                            </Button>
                            <Button 
                              size="sm" 
                              variant={aiDraftTone === 'PROFESSIONAL' ? 'info' : 'outline-light'}
                              className={`py-1 px-2 text-dark text-nowrap rounded-pill ${aiDraftTone === 'PROFESSIONAL' ? 'fw-bold' : 'text-secondary'}`}
                              style={{ fontSize: '0.7rem' }}
                              onClick={() => { playSynthSound('click'); setAiDraftTone('PROFESSIONAL'); }}
                            >
                              💼 Professional
                            </Button>
                            <Button 
                              size="sm" 
                              variant={aiDraftTone === 'CASUAL' ? 'info' : 'outline-light'}
                              className={`py-1 px-2 text-dark text-nowrap rounded-pill ${aiDraftTone === 'CASUAL' ? 'fw-bold' : 'text-secondary'}`}
                              style={{ fontSize: '0.7rem' }}
                              onClick={() => { playSynthSound('click'); setAiDraftTone('CASUAL'); }}
                            >
                              ☕ Casual
                            </Button>
                          </div>

                          <p className="small text-secondary mb-3 bg-white p-2 rounded border border-light font-monospace" style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                            {getAiDraftResponse(selectedTicket, aiDraftTone)}
                          </p>

                          <Button 
                            size="sm" 
                            className="btn-primary-custom w-100 py-2"
                            style={{ fontSize: '0.8rem' }}
                            onClick={() => {
                              playSynthSound('click');
                              setNewCommentContent(getAiDraftResponse(selectedTicket, aiDraftTone));
                            }}
                          >
                            Apply Draft Response
                          </Button>
                        </Card>

                        <div className="mb-4" style={{ maxHeight: '40%', overflowY: 'auto' }}>
                          {comments.length === 0 ? (
                            <p className="text-muted text-center py-4 my-0 font-monospace">&gt; NO COMMENTS POSTED YET.</p>
                          ) : (
                            <ListGroup variant="flush">
                              {comments.map(c => (
                                <ListGroup.Item
                                  key={c.id}
                                  className="border-0 mb-3 p-3"
                                  style={{
                                    background: c.isInternal ? 'rgba(139, 92, 246, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                    borderLeft: c.isInternal ? '4px solid var(--accent-violet)' : '4px solid var(--accent-green)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '8px'
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
                        <Form onSubmit={handleAddComment} className="glass-panel p-3" style={{ border: '1px solid var(--border-color)' }}>
                          <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold text-muted font-monospace">&gt; ADD REPLY / MESSAGE</Form.Label>
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
                              onMouseEnter={() => playSynthSound('hover')}
                              onClick={() => playSynthSound('click')}
                              disabled={commentSubmitting}
                            >
                              {commentSubmitting ? 'Posting...' : 'Post Reply'}
                            </Button>
                          </div>
                        </Form>
                      </Tab.Pane>

                      {/* Audit Log / History Tab */}
                      <Tab.Pane eventKey="history">
                        <h6 className="text-muted small fw-bold mb-3 font-monospace">&gt; TICKET ACTIVITY LOG</h6>
                        {logs.length === 0 ? (
                          <p className="text-muted text-center py-4 font-monospace">&gt; NO ACTIVITY LOGS RECORDED.</p>
                        ) : (
                          <div className="timeline">
                            {logs.map(log => (
                              <div key={log.id} className="timeline-item mb-3 pb-3 border-bottom font-monospace" style={{ fontSize: '0.8rem', borderColor: 'var(--border-color)' }}>
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="fw-bold small text-dark">{log.action}</span>
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
        style={{ color: 'var(--text-primary)' }}
      >
        <Modal.Header closeButton closeVariant="dark" className="border-bottom" style={{ borderColor: 'var(--border-color)' }}>
          <Modal.Title className="fw-bold text-dark font-monospace">&gt; CREATE NEW TICKET</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateTicket}>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="title">
              <Form.Label className="small fw-bold font-monospace text-muted">&gt; SUBJECT / TITLE</Form.Label>
              <Form.Control
                type="text"
                placeholder="Brief summary of the issue"
                className="form-control-dark"
                value={newTicket.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                disabled={createSubmitting}
                required
              />
              {kbSuggestions.length > 0 && (
                <div className="glass-panel p-2 mt-2 border rounded" style={{ maxHeight: '180px', overflowY: 'auto', background: 'var(--bg-main)', borderColor: 'var(--accent-cyan)' }}>
                  <div className="small text-info font-monospace mb-1" style={{ fontSize: '0.75rem' }}>&gt; RECOMMENDED SOLUTIONS:</div>
                  {kbSuggestions.map(article => (
                    <div key={article.id} className="border-bottom py-1 last-border-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <div 
                        className="small fw-bold text-primary" 
                        onClick={() => { playSynthSound('click'); setExpandedKbArticleId(expandedKbArticleId === article.id ? null : article.id); }}
                        style={{ cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        {expandedKbArticleId === article.id ? '▼' : '▶'} {article.title}
                      </div>
                      {expandedKbArticleId === article.id && (
                        <div className="text-secondary small mt-1" style={{ whiteSpace: 'pre-wrap', paddingLeft: '12px', fontSize: '0.7rem', lineHeight: '1.4' }}>
                          {article.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="description">
              <Form.Label className="small fw-bold font-monospace text-muted">&gt; DESCRIPTION / DETAILS</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Explain the issue in detail"
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
                  <Form.Label className="small fw-bold font-monospace text-muted">&gt; PRIORITY LEVEL</Form.Label>
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
                  <Form.Label className="small fw-bold font-monospace text-muted">&gt; CATEGORY</Form.Label>
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
          <Modal.Footer className="border-top" style={{ borderColor: 'var(--border-color)' }}>
            <Button
              className="btn-outline-custom px-4 py-2"
              onMouseEnter={() => playSynthSound('hover')}
              onClick={() => { playSynthSound('click'); setShowCreateModal(false); }}
              disabled={createSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="btn-primary-custom px-4 py-2"
              type="submit"
              onMouseEnter={() => playSynthSound('hover')}
              onClick={() => playSynthSound('click')}
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
