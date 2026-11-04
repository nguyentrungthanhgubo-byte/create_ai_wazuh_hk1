import React from 'react';
import { ArrowLeft, Wrench } from 'lucide-react';

import './ToolWorkspace.scss';

const ToolWorkspace = ({ title, description, onBack }) => {
    return (
        <main className="tool-workspace">

            <header className="tool-workspace-header">
                <button onClick={onBack}>
                    <ArrowLeft size={18} />
                    ToolHome
                </button>
            </header>

            <div className="tool-workspace-content">

                <div className="tool-workspace-icon">
                    <Wrench size={30} />
                </div>

                <h1>{title}</h1>

                <p>{description}</p>

                <div className="tool-workspace-coming">
                    <span>MODULE INITIALIZED</span>
                    <p>
                        Giao diện module đã sẵn sàng.
                        Chức năng nghiệp vụ sẽ được phát triển riêng
                        trong module này.
                    </p>
                </div>

            </div>

        </main>
    );
};

export default ToolWorkspace;