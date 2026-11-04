import React, { useState } from 'react';
import {
    Home,
    Wrench,
    ShieldBan,
    FilePlus,
    Server,
    ScanSearch,
    Radar,
    ShieldAlert,
    ChevronRight,
    X
} from 'lucide-react';
import './ToolNavigation.scss';

const toolItems = [
    { id: 'toolIPManager', name: 'IP Manager', icon: ShieldBan },
    { id: 'toolCreateRule', name: 'Create Wazuh Rule', icon: FilePlus },
    { id: 'toolServerMonitor', name: 'Server Monitor', icon: Server },
    { id: 'toolAttackAnalysis', name: 'Attack Analysis', icon: ScanSearch },
    { id: 'toolIPTracking', name: 'IP Tracking', icon: Radar },
    { id: 'toolThreatDetection', name: 'Threat Detection', icon: ShieldAlert }
];

const ToolNavigation = ({
    isOpen,
    onClose,
    activePage,
    onNavigate
}) => {
    const [expanded, setExpanded] = useState(
        activePage !== 'home'
    );

    if (!isOpen) return null;

    return (
        <div className="app-navigation-overlay" onClick={onClose}>

            <aside
                className="app-navigation"
                onClick={(e) => e.stopPropagation()}
            >

                <div className="app-navigation-header">
                    <div className="navigation-brand">
                        <ShieldBan size={23} />
                        <span>Wazuh AI Assistant</span>
                    </div>

                    <button onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="navigation-section-title">
                    WORKSPACE
                </div>

                {/* HOME */}

                <button
                    className={`navigation-item ${activePage === 'home' ? 'active' : ''
                        }`}
                    onClick={() => onNavigate('home')}
                >
                    <Home size={19} />
                    <span>Home</span>
                </button>

                {/* TOOL HOME */}

                {/* <button
                    className={`navigation-item ${activePage === 'toolHome' ? 'active' : ''
                        }`}
                    onClick={() => {
                        onNavigate('toolHome');
                        setExpanded(!expanded);
                    }}
                >
                    <Wrench size={19} />
                    <span>ToolHome</span>

                    <ChevronRight
                        className={`navigation-chevron ${expanded ? 'expanded' : ''
                            }`}
                        size={18}
                    />
                </button> */}
                <button
                    className={`navigation-item ${expanded ? 'active' : ''}`}
                    onClick={() => setExpanded(prev => !prev)}
                >
                    <Wrench size={19} />
                    <span>ToolHome</span>

                    <ChevronRight
                        className={`navigation-chevron ${expanded ? 'expanded' : ''}`}
                        size={18}
                    />
                </button>
                {/* DANH SÁCH TOOLS */}

                {expanded && (
                    <div className="navigation-submenu">

                        {toolItems.map((tool) => {
                            const Icon = tool.icon;

                            return (
                                <button
                                    key={tool.id}
                                    className={`navigation-subitem ${activePage === tool.id
                                        ? 'active'
                                        : ''
                                        }`}
                                    onClick={() => onNavigate(tool.id)}
                                >
                                    <Icon size={17} />
                                    <span>{tool.name}</span>
                                </button>
                            );
                        })}

                    </div>
                )}

                <div className="navigation-footer">
                    Wazuh AI Security Platform
                </div>

            </aside>
        </div>
    );
};

export default ToolNavigation;