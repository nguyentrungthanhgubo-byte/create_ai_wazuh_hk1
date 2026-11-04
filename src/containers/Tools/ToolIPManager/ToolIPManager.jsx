import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
    ArrowLeft,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Activity,
    RefreshCw,
    Search,
    AlertTriangle,
    Clock,
    Server,
    ChevronDown,
    ChevronUp,
    Eye,
    Ban,
    Network,
    LockKeyhole,
    Info,
    XCircle,
    Radar,
} from 'lucide-react';
import './ToolIPManager.scss';

const ToolIPManager = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [windowMinutes, setWindowMinutes] = useState(60);
    const [threshold, setThreshold] = useState(5);
    const [threatData, setThreatData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [expandedIP, setExpandedIP] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchThreats = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await axios.get('/api/threats/brute-force', {
                params: {
                    window_minutes: windowMinutes,
                    threshold,
                    limit: 1000,
                },
                timeout: 120000,
            });

            const result = response.data;

            if (result?.errCode !== 0 || !result?.data) {
                throw new Error(result?.message || 'Không nhận được dữ liệu từ Threat Detection API.');
            }

            setThreatData(result.data);
            setLastUpdated(new Date());
        } catch (err) {
            const message =
                err.response?.data?.message ||
                err.response?.data?.detail ||
                err.message ||
                'Không thể kết nối đến Threat Detection API.';

            setError(message);
        } finally {
            setLoading(false);
        }
    }, [windowMinutes, threshold]);

    useEffect(() => {
        fetchThreats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const detectedIPs = Array.isArray(threatData?.detected_ips)
        ? threatData.detected_ips
        : [];

    const filteredIPs = detectedIPs.filter((item) =>
        [
            item.ip,
            item.severity,
            ...(item.target_accounts || []),
            ...(item.agents || []),
        ]
            .join(' ')
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
    );

    const totalAttempts = detectedIPs.reduce(
        (sum, item) => sum + (Number(item.failed_attempts) || 0),
        0
    );

    const skipped = threatData?.skipped || {};

    const formatTime = (value) => {
        if (!value) return 'Không xác định';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const severityClass = (severity) => {
        const value = String(severity || '').toUpperCase();

        if (value === 'HIGH' || value === 'CRITICAL') return 'danger';
        if (value === 'MEDIUM') return 'warning';

        return 'normal';
    };

    const tabs = [
        { id: 'overview', label: 'Tổng quan', icon: Activity },
        { id: 'detection', label: 'Threat Detection', icon: Radar },
        { id: 'management', label: 'IP Management', icon: Network },
    ];

    const StatCard = ({ icon: Icon, label, value, note, color }) => (
        <div className="ipm-stat-card">
            <div className={`ipm-stat-icon ${color}`}>
                <Icon size={21} />
            </div>
            <div className="ipm-stat-info">
                <span className="ipm-stat-label">{label}</span>
                <strong>{value}</strong>
                <small>{note}</small>
            </div>
        </div>
    );

    const renderThreatTable = () => (
        <div className="ipm-table-container">
            <div className="ipm-table-toolbar">
                <div>
                    <h3>Danh sách IP đáng ngờ</h3>
                    <p>Các địa chỉ IP được phát hiện từ sự kiện Wazuh</p>
                </div>

                <div className="ipm-search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Tìm IP, tài khoản, agent..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredIPs.length === 0 ? (
                <div className="ipm-empty">
                    <ShieldCheck size={38} />
                    <h3>{detectedIPs.length === 0 ? 'Chưa phát hiện IP đáng ngờ' : 'Không tìm thấy kết quả'}</h3>
                    <p>
                        {detectedIPs.length === 0
                            ? 'Không có IP nào đạt ngưỡng phát hiện trong khoảng thời gian đã chọn.'
                            : 'Thử tìm kiếm bằng một địa chỉ IP hoặc từ khóa khác.'}
                    </p>
                </div>
            ) : (
                <div className="ipm-table-scroll">
                    <table className="ipm-table">
                        <thead>
                            <tr>
                                <th>ĐỊA CHỈ IP</th>
                                <th>MỨC ĐỘ</th>
                                <th>FAILED ATTEMPTS</th>
                                <th>TÀI KHOẢN</th>
                                <th>AGENT</th>
                                <th>THỜI GIAN GẦN NHẤT</th>
                                <th>CHI TIẾT</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredIPs.map((item) => (
                                <React.Fragment key={item.ip}>
                                    <tr>
                                        <td>
                                            <div className="ipm-ip-cell">
                                                <div className="ipm-mini-icon">
                                                    <Network size={15} />
                                                </div>
                                                <strong>{item.ip}</strong>
                                            </div>
                                        </td>

                                        <td>
                                            <span className={`ipm-severity ${severityClass(item.severity)}`}>
                                                <span />
                                                {item.severity || 'UNKNOWN'}
                                            </span>
                                        </td>

                                        <td>
                                            <strong className="ipm-attempt-count">
                                                {item.failed_attempts ?? 0}
                                            </strong>
                                        </td>

                                        <td>
                                            {(item.target_accounts || []).join(', ') || 'N/A'}
                                        </td>

                                        <td>
                                            {(item.agents || []).join(', ') || 'N/A'}
                                        </td>

                                        <td>{formatTime(item.last_seen)}</td>

                                        <td>
                                            <button
                                                className="ipm-detail-btn"
                                                onClick={() =>
                                                    setExpandedIP(expandedIP === item.ip ? null : item.ip)
                                                }
                                            >
                                                <Eye size={15} />
                                                {expandedIP === item.ip ? 'Đóng' : 'Xem'}
                                                {expandedIP === item.ip ? (
                                                    <ChevronUp size={14} />
                                                ) : (
                                                    <ChevronDown size={14} />
                                                )}
                                            </button>
                                        </td>
                                    </tr>

                                    {expandedIP === item.ip && (
                                        <tr className="ipm-expanded-row">
                                            <td colSpan="7">
                                                <div className="ipm-expanded-content">
                                                    <div className="ipm-detail-grid">
                                                        <div>
                                                            <span>IP ADDRESS</span>
                                                            <strong>{item.ip}</strong>
                                                        </div>
                                                        <div>
                                                            <span>FIRST SEEN</span>
                                                            <strong>{formatTime(item.first_seen)}</strong>
                                                        </div>
                                                        <div>
                                                            <span>LAST SEEN</span>
                                                            <strong>{formatTime(item.last_seen)}</strong>
                                                        </div>
                                                        <div>
                                                            <span>TIME WINDOW</span>
                                                            <strong>{item.window_minutes ?? windowMinutes} phút</strong>
                                                        </div>
                                                        <div>
                                                            <span>EVENT IDS</span>
                                                            <strong>{(item.event_ids || []).join(', ') || 'N/A'}</strong>
                                                        </div>
                                                        <div>
                                                            <span>RECOMMENDED ACTION</span>
                                                            <strong>{item.recommended_action || 'REVIEW'}</strong>
                                                        </div>
                                                    </div>

                                                    <h4>Chi tiết sự kiện đăng nhập thất bại</h4>

                                                    {Array.isArray(item.events) && item.events.length > 0 ? (
                                                        <div className="ipm-event-list">
                                                            {item.events.map((event, index) => (
                                                                <div
                                                                    className="ipm-event-item"
                                                                    key={event.alert_id || `${event.event_id}-${index}`}
                                                                >
                                                                    <div className="ipm-event-dot" />
                                                                    <div className="ipm-event-main">
                                                                        <strong>Event ID: {event.event_id || 'N/A'}</strong>
                                                                        <span>{formatTime(event.timestamp)}</span>
                                                                        <small>
                                                                            User: {event.username || 'N/A'} · Agent:{' '}
                                                                            {event.agent || 'N/A'} · Rule:{' '}
                                                                            {event.rule_id || 'N/A'}
                                                                        </small>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="ipm-muted">Không có thông tin sự kiện chi tiết.</p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return (
        <main className="ipm-page">
            <header className="ipm-header">
                <button className="ipm-back" onClick={onBack}>
                    <ArrowLeft size={18} />
                    <span>Tool Home</span>
                </button>

                <div className="ipm-header-right">
                    <span className="ipm-live-dot" />
                    <span>Wazuh Security Monitoring</span>
                </div>
            </header>

            <div className="ipm-content">
                <div className="ipm-title-row">
                    <div className="ipm-title-group">
                        <div className="ipm-title-icon">
                            <Shield size={25} />
                        </div>
                        <div>
                            <h1>IP Manager</h1>
                            <p>Giám sát IP, phát hiện brute-force và quản lý địa chỉ đáng ngờ.</p>
                        </div>
                    </div>

                    <button
                        className="ipm-refresh"
                        onClick={fetchThreats}
                        disabled={loading}
                    >
                        <RefreshCw size={15} className={loading ? 'ipm-spin' : ''} />
                        <span className="ipm-refresh-label">
                            {loading ? 'Đang tải...' : 'Làm mới dữ liệu'}
                        </span>
                    </button>
                </div>

                <nav className="ipm-tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.id}
                                className={`ipm-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {error && (
                    <div className="ipm-error">
                        <XCircle size={19} />
                        <div>
                            <strong>Không thể tải dữ liệu Threat Detection</strong>
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                {activeTab === 'overview' && (
                    <>
                        <div className="ipm-stats">
                            <StatCard
                                icon={Network}
                                label="IP đáng ngờ"
                                value={threatData?.detected_count ?? detectedIPs.length}
                                note="Theo kết quả phát hiện"
                                color="blue"
                            />
                            <StatCard
                                icon={ShieldAlert}
                                label="Tổng lần đăng nhập lỗi"
                                value={totalAttempts}
                                note="Trong các IP được phát hiện"
                                color="red"
                            />
                            <StatCard
                                icon={Activity}
                                label="Events đã quét"
                                value={threatData?.events_scanned ?? 0}
                                note="Sự kiện được phân tích"
                                color="orange"
                            />
                            <StatCard
                                icon={ShieldCheck}
                                label="IP bị bỏ qua"
                                value={Object.values(skipped).reduce(
                                    (sum, value) => sum + (Number(value) || 0),
                                    0
                                )}
                                note="Không đủ điều kiện phân tích"
                                color="green"
                            />
                        </div>

                        <div className="ipm-info-banner">
                            <Info size={19} />
                            <div>
                                <strong>Trạng thái hệ thống phát hiện</strong>
                                <p>
                                    Detector: {threatData?.detector || 'windows_brute_force'}.
                                    Ngưỡng hiện tại: {threshold} lần đăng nhập thất bại trong
                                    {` ${windowMinutes} phút`}. Hệ thống chỉ phát hiện và đề xuất
                                    xử lý, chưa tự động chặn IP.
                                </p>
                            </div>
                        </div>

                        <div className="ipm-panel">
                            <div className="ipm-panel-heading">
                                <div>
                                    <h3>Cấu hình phát hiện</h3>
                                    <p>Điều chỉnh điều kiện truy vấn dữ liệu brute-force</p>
                                </div>
                                <Radar size={20} color="#60a5fa" />
                            </div>

                            <div className="ipm-filter-grid">
                                <div className="ipm-field">
                                    <label>Khoảng thời gian</label>
                                    <select
                                        value={windowMinutes}
                                        onChange={(e) => setWindowMinutes(Number(e.target.value))}
                                    >
                                        <option value={5}>5 phút</option>
                                        <option value={15}>15 phút</option>
                                        <option value={30}>30 phút</option>
                                        <option value={60}>1 giờ</option>
                                        <option value={120}>2 giờ</option>
                                        <option value={360}>6 giờ</option>
                                        <option value={720}>12 giờ</option>
                                        <option value={1440}>24 giờ</option>
                                    </select>
                                </div>

                                <div className="ipm-field">
                                    <label>Ngưỡng đăng nhập thất bại</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="10000"
                                        value={threshold}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setThreshold(value === '' ? '' : Number(value));
                                        }}
                                        onBlur={() => {
                                            if (!threshold || threshold < 2) setThreshold(2);
                                            if (threshold > 10000) setThreshold(10000);
                                        }}
                                    />
                                </div>

                                <button
                                    className="ipm-refresh"
                                    onClick={fetchThreats}
                                    disabled={loading || !Number.isInteger(threshold) || threshold < 2 || threshold > 10000}
                                >
                                    <Radar size={15} />
                                    Áp dụng
                                </button>

                                <span className="ipm-filter-hint">
                                    Dữ liệu được lấy trực tiếp từ Wazuh Threat Detection API
                                </span>
                            </div>
                        </div>

                        {renderThreatTable()}

                        <div className="ipm-last-updated" style={{ marginTop: 13 }}>
                            <Clock size={13} />
                            Cập nhật lần cuối: {lastUpdated ? formatTime(lastUpdated) : 'Chưa có dữ liệu'}
                        </div>
                    </>
                )}

                {activeTab === 'detection' && (
                    <>
                        <div className="ipm-stats">
                            <StatCard
                                icon={Network}
                                label="IP được phát hiện"
                                value={threatData?.detected_count ?? detectedIPs.length}
                                note="Đạt ngưỡng brute-force"
                                color="blue"
                            />
                            <StatCard
                                icon={AlertTriangle}
                                label="Failed attempts"
                                value={totalAttempts}
                                note="Tổng trên các IP phát hiện"
                                color="red"
                            />
                            <StatCard
                                icon={Server}
                                label="Events scanned"
                                value={threatData?.events_scanned ?? 0}
                                note="Sự kiện đã quét"
                                color="orange"
                            />
                            <StatCard
                                icon={Clock}
                                label="Time window"
                                value={`${windowMinutes}m`}
                                note="Khoảng thời gian phân tích"
                                color="green"
                            />
                        </div>

                        <div className="ipm-panel">
                            <div className="ipm-panel-heading">
                                <div>
                                    <h3>Threat Detection Configuration</h3>
                                    <p>Thay đổi tham số và chạy lại phân tích</p>
                                </div>
                                <Radar size={20} color="#60a5fa" />
                            </div>

                            <div className="ipm-filter-grid">
                                <div className="ipm-field">
                                    <label>Thời gian phân tích</label>
                                    <select
                                        value={windowMinutes}
                                        onChange={(e) => setWindowMinutes(Number(e.target.value))}
                                    >
                                        <option value={5}>5 phút</option>
                                        <option value={15}>15 phút</option>
                                        <option value={30}>30 phút</option>
                                        <option value={60}>1 giờ</option>
                                        <option value={120}>2 giờ</option>
                                        <option value={360}>6 giờ</option>
                                        <option value={720}>12 giờ</option>
                                        <option value={1440}>24 giờ</option>
                                    </select>
                                </div>

                                <div className="ipm-field">
                                    <label>Threshold</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="10000"
                                        value={threshold}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setThreshold(value === '' ? '' : Number(value));
                                        }}
                                        onBlur={() => {
                                            if (!threshold || threshold < 2) setThreshold(2);
                                            if (threshold > 10000) setThreshold(10000);
                                        }}
                                    />
                                </div>

                                <button
                                    className="ipm-refresh"
                                    onClick={fetchThreats}
                                    disabled={loading || !Number.isInteger(threshold) || threshold < 2 || threshold > 10000}
                                >
                                    <Radar size={15} />
                                    Chạy phát hiện
                                </button>
                            </div>
                        </div>

                        <div className="ipm-status-card">
                            <div className="ipm-status-left">
                                <div className="ipm-stat-icon blue">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h3>Windows Brute-force Detector</h3>
                                    <p>Phân tích các sự kiện đăng nhập thất bại từ Wazuh</p>
                                </div>
                            </div>
                            <span className="ipm-status-label">
                                {threatData?.status === 'success' ? 'CONNECTED' : loading ? 'SCANNING' : 'NO DATA'}
                            </span>
                        </div>

                        {renderThreatTable()}

                        <div className="ipm-panel" style={{ marginTop: 20 }}>
                            <div className="ipm-panel-heading">
                                <div>
                                    <h3>Thống kê sự kiện bị bỏ qua</h3>
                                    <p>Các sự kiện không được sử dụng để phát hiện</p>
                                </div>
                                <Info size={19} color="#92939e" />
                            </div>

                            <div className="ipm-detail-grid">
                                <div>
                                    <span>INVALID EVENT</span>
                                    <strong>{skipped.invalid_event ?? 0}</strong>
                                </div>
                                <div>
                                    <span>NO IP</span>
                                    <strong>{skipped.no_ip ?? 0}</strong>
                                </div>
                                <div>
                                    <span>PROTECTED IP</span>
                                    <strong>{skipped.protected_ip ?? 0}</strong>
                                </div>
                                <div>
                                    <span>INVALID TIMESTAMP</span>
                                    <strong>{skipped.invalid_timestamp ?? 0}</strong>
                                </div>
                                <div>
                                    <span>AUTOMATIC BLOCKING</span>
                                    <strong>{threatData?.automatic_blocking === true ? 'Enabled' : 'Disabled'}</strong>
                                </div>
                                <div>
                                    <span>DETECTOR</span>
                                    <strong>{threatData?.detector || 'N/A'}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="ipm-last-updated">
                            <Clock size={13} />
                            Cập nhật lần cuối: {lastUpdated ? formatTime(lastUpdated) : 'Chưa có dữ liệu'}
                        </div>
                    </>
                )}

                {activeTab === 'management' && (
                    <>
                        <div className="ipm-info-banner">
                            <Info size={19} />
                            <div>
                                <strong>IP Management chưa kết nối backend</strong>
                                <p>
                                    Backend hiện tại mới cung cấp API phát hiện brute-force.
                                    Chưa có API lưu danh sách IP, chặn IP hoặc mở chặn IP.
                                </p>
                            </div>
                        </div>

                        <div className="ipm-management-placeholder">
                            <div className="ipm-management-icon">
                                <LockKeyhole size={28} />
                            </div>
                            <h3>IP Management</h3>
                            <p>
                                Khu vực quản lý IP sẽ được triển khai sau khi xây dựng API
                                backend và cơ chế xác nhận thao tác. Hiện tại hệ thống chỉ
                                giám sát và phát hiện IP đáng ngờ, không thực hiện chặn IP.
                            </p>

                            <div className="ipm-management-features">
                                <span><Search size={12} style={{ verticalAlign: 'middle' }} /> Tra cứu IP</span>
                                <span><Ban size={12} style={{ verticalAlign: 'middle' }} /> Block IP</span>
                                <span><ShieldCheck size={12} style={{ verticalAlign: 'middle' }} /> Unblock IP</span>
                                <span><Clock size={12} style={{ verticalAlign: 'middle' }} /> Block History</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
};

export default ToolIPManager;