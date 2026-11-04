import React from 'react';
import ToolWorkspace from '../shared/ToolWorkspace';

export default function ToolAttackAnalysis(props) {
    return (
        <ToolWorkspace
            title="Attack Analysis"
            description="Phân tích brute force, sự kiện và các cuộc tấn công."
            {...props}
        />
    );
}