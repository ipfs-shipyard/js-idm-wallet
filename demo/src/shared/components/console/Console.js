import React from 'react';
import PropTypes from 'prop-types';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { twilight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './Console.css';

const Console = ({ logData }) => {

    return (
        <div className="console">
            { logData &&
                <SyntaxHighlighter language="javascript" style={twilight}>
                    {JSON.stringify(logData, null, 2)}
                </SyntaxHighlighter>
            }
        </div>
    );
}

Console.propTypes = {
    logData: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
};

export default Console;
