'use client';

import { GL } from './gl';
import { useState } from 'react';

export default function AnimatedBackground() {
    // We can add interactivity here if needed, passing hover states to GL
    const [hovering, setHovering] = useState(false);

    return (
        <div className="fixed inset-0 z-0">
            <GL hovering={hovering} />
        </div>
    );
}
