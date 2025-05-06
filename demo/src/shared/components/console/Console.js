import React from 'react';
import PropTypes from 'prop-types';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { twilight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './Console.css';

const Console = ({ logData, forward, backward }) => {
    return (
        <div className="console">
            { logData &&
                <SyntaxHighlighter language="javascript" style={twilight}>
                    {JSON.stringify(logData, null, 2)}
                </SyntaxHighlighter>
            }
            <div className="controls">
                <button onClick={ backward }>&lt;</button>
                <button onClick={ forward }>&gt;</button>
            </div>
        </div>
    );
}

Console.propTypes = {
    logData: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
    forward: PropTypes.func,
    backward: PropTypes.func,
};

export default Console;
