import React from 'react';
import ToolWorkspace from '../shared/ToolWorkspace';

export default function ToolCreateRule(props) {
    return (
        <ToolWorkspace
            title="Create Wazuh Rule"
            description="Tạo và quản lý các quy tắc phát hiện bảo mật Wazuh."
            {...props}
        />
    );
}