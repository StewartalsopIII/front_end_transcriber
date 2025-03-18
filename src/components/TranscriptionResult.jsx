import React, { useState } from 'react';
import styled from 'styled-components';

const TranscriptionContainer = styled.div`
  margin-top: 2rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 1.5rem;
`;

const ResultHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ResultTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  transition: all 0.1s ease;
  
  &:hover {
    background-color: #e5e7eb;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const TranscriptContent = styled.div`
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
  font-family: monospace;
  white-space: pre-wrap;
  max-height: 500px;
  overflow-y: auto;
  line-height: 1.6;
`;

const Timestamp = styled.span`
  color: #3b82f6;
  font-weight: 600;
  margin-right: 0.25rem;
`;

const SpeakerName = styled.span`
  color: #10b981;
  font-weight: 600;
  margin-right: 0.25rem;
`;

const SuccessMessage = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  background-color: #10b981;
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 0.25rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

function formatTranscription(text) {
  // Match patterns like [00:01:23] or [00:01.2]
  const regex = /\[(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)\]\s*(?:(\w+):)?/g;
  
  let lastIndex = 0;
  const elements = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const timestamp = match[1];
    const speaker = match[2] || null;
    
    // Get text between current and next timestamp
    const nextStart = regex.lastIndex;
    const nextMatchIndex = text.indexOf('[', nextStart);
    const endIndex = nextMatchIndex !== -1 ? nextMatchIndex : text.length;
    const content = text.slice(nextStart, endIndex).trim();
    
    elements.push(
      <div key={match.index}>
        <Timestamp>[{timestamp}]</Timestamp>
        {speaker && <SpeakerName>{speaker}:</SpeakerName>}
        {content}
      </div>
    );
    
    lastIndex = endIndex;
  }
  
  // Add any remaining text
  if (lastIndex < text.length) {
    elements.push(<div key="remaining">{text.slice(lastIndex)}</div>);
  }
  
  return elements;
}

function TranscriptionResult({ transcription }) {
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(transcription);
    setShowCopiedMessage(true);
    setTimeout(() => setShowCopiedMessage(false), 3000);
  };
  
  const handleDownload = () => {
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <TranscriptionContainer>
      <ResultHeader>
        <ResultTitle>Transcription Result</ResultTitle>
        <ActionButtons>
          <ActionButton onClick={handleCopy}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
            Copy
          </ActionButton>
          <ActionButton onClick={handleDownload}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            Download
          </ActionButton>
        </ActionButtons>
      </ResultHeader>
      
      <TranscriptContent>
        {formatTranscription(transcription)}
      </TranscriptContent>
      
      {showCopiedMessage && (
        <SuccessMessage>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          Copied to clipboard!
        </SuccessMessage>
      )}
    </TranscriptionContainer>
  );
}

export default TranscriptionResult;