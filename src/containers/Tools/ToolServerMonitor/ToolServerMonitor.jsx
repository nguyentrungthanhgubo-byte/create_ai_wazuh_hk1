import React from 'react';
import ToolWorkspace from '../shared/ToolWorkspace';

export default function ToolServerMonitor(props) {
    return (
        <ToolWorkspace
            title="Server Monitor"
            description="Theo dõi tài nguyên và tình trạng hoạt động của Server."
            {...props}
        />
    );
}