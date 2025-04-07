'use client';

import { useState } from 'react';

interface BusinessChatProps {
  businessId: string;
}

export default function BusinessChat({ businessId }: BusinessChatProps) {
  return (
    <div>
      <p>Chat component for business: {businessId}</p>
    </div>
  );
} 