import React from 'react';
import ToolWorkspace from '../shared/ToolWorkspace';

export default function ToolIPTracking(props) {
    return (
        <ToolWorkspace
            title="IP Tracking"
            description="Theo dõi IP đáng ngờ và lịch sử hoạt động."
            {...props}
        />
    );
}