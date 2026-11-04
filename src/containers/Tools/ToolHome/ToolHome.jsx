import React from 'react';
import {
    ShieldBan,
    FilePlus,
    Server,
    ScanSearch,
    Radar
} from 'lucide-react';

import './ToolHome.scss';

const tools = [
    {
        id: 'toolIPManager',
        title: 'IP Manager',
        description: 'Quản lý IP bị chặn, mở khóa và theo dõi danh sách IP.',
        icon: ShieldBan
    },
    {
        id: 'toolCreateRule',
        title: 'Create Wazuh Rule',
        description: 'Tạo, kiểm tra và quản lý các quy tắc phát hiện bảo mật.',
        icon: FilePlus
    },
    {
        id: 'toolServerMonitor',
        title: 'Server Monitor',
        description: 'Theo dõi CPU, RAM, Disk và trạng thái máy chủ.',
        icon: Server
    },
    {
        id: 'toolAttackAnalysis',
        title: 'Attack Analysis',
        description: 'Phân tích sự kiện, brute force và các cuộc tấn công.',
        icon: ScanSearch
    },
    {
        id: 'toolIPTracking',
        title: 'IP Tracking',
        description: 'Theo dõi IP đáng ngờ và lịch sử hoạt động.',
        icon: Radar
    }
];

const ToolHome = ({ onNavigate }) => {
    return (
        <div className="tool-home">

            <header className="tool-home-header">
                <div>
                    <span className="tool-home-label">
                        SECURITY CENTER
                    </span>

                    <h1>Security Tools</h1>

                    <p>
                        Trung tâm quản lý và vận hành các công cụ
                        bảo mật của Wazuh AI Assistant.
                    </p>
                </div>
            </header>

            <div className="tool-home-grid">

                {tools.map((tool) => {
                    const Icon = tool.icon;

                    return (
                        <div
                            className="tool-card"
                            key={tool.id}
                            onClick={() => onNavigate(tool.id)}
                        >
                            <div className="tool-card-icon">
                                <Icon size={25} />
                            </div>

                            <h3>{tool.title}</h3>

                            <p>{tool.description}</p>

                            <span className="tool-card-action">
                                Open Tool →
                            </span>
                        </div>
                    );
                })}

            </div>

        </div>
    );
};

export default ToolHome;