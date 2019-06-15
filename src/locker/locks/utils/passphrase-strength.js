import zxcvbn from 'zxcvbn';
import normalizeValue from 'normalize-value';

const feedbackMessages = [
    {
        regExp: /Use a few words, avoid common phrases/i,
        code: 'USE_A_FEW_WORDS',
    },
    {
        regExp: /No need for symbols, digits, or uppercase letters/i,
        code: 'NO_NEED_FOR_MIXED_CHARS',
    },
    {
        regExp: /Add another word or two. Uncommon words are better/i,
        code: 'UNCOMMON_WORDS_ARE_BETTER',
        message: 'Add another word or two, uncommon words are better',
    },
    {
        regExp: /Straight rows of keys are easy to guess/i,
        code: 'STRAIGHT_ROWS_OF_KEYS_ARE_EASY',
    },
    {
        regExp: /Short keyboard patterns are easy to guess/i,
        code: 'SHORT_KEYBOARD_PATTERNS_ARE_EASY',
    },
    {
        regExp: /Use a longer keyboard pattern with more turns/i,
        code: 'USE_LONGER_KEYBOARD_PATTERNS',
    },
    {
        regExp: /Repeats like "aaa" are easy to guess/i,
        code: 'REPEATED_CHARS_ARE_EASY',
    },
    {
        regExp: /Repeats like "abcabcabc" are only slightly harder to guess than "abc"/i,
        code: 'REPEATED_PATTERNS_ARE_EASY',
    },
    {
        regExp: /Repeats like "abcabcabc" are only slightly harder to guess than "abc"/i,
        code: 'REPEATED_PATTERNS_ARE_EASY',
    },
    {
        regExp: /Avoid repeated words and characters/,
        code: 'AVOID_REPEATED_CHARS',
    },
    {
        regExp: /Sequences like abc or 6543 are easy to guess/,
        code: 'SEQUENCES_ARE_EASY',
    },
    {
        regExp: /Avoid sequences/,
        code: 'AVOID_SEQUENCES',
    },
    {
        regExp: /Recent years are easy to guess/,
        code: 'RECENT_YEARS_ARE_EASY',
    },
    {
        regExp: /Avoid recent years/,
        code: 'AVOID_RECENT_YEARS',
    },
    {
        regExp: /Avoid years that are associated with you/,
        code: 'AVOID_ASSOCIATED_YEARS',
    },
    {
        regExp: /Dates are often easy to guess/,
        code: 'DATES_ARE_EASY',
    },
    {
        regExp: /Avoid dates and years that are associated with you/,
        code: 'avoid_associated_dates_and_years',
    },
    {
        regExp: /This is a top-10 common password/,
        code: 'TOP10_COMMON_PASSWORD',
    },
    {
        regExp: /This is a top-100 common password/,
        code: 'TOP100_COMMON_PASSWORD',
    },
    {
        regExp: /This is a very common password/,
        code: 'VERY_COMMON_PASSWORD',
    },
    {
        regExp: /This is similar to a commonly used password/,
        code: 'SIMILAR_TO_COMMON_PASSWORD',
    },
    {
        regExp: /A word by itself is easy to guess/,
        code: 'A_WORD_IS_EASY',
    },
    {
        regExp: /Names and surnames by themselves are easy to guess/,
        code: 'NAMES_ARE_EASY',
    },
    {
        regExp: /Common names and surnames are easy to guess/,
        code: 'COMMON_NAMES_ARE_EASY',
    },
    {
        regExp: /Capitalization doesn\\'t help very much/,
        code: 'CAPITALIZATION_DOESNT_HELP',
    },
    {
        regExp: /All-uppercase is almost as easy to guess as all-lowercase/,
        code: 'ALL_UPPERCASE_DOESNT_HELP',
    },
    {
        regExp: /Reversed words aren\\'t much harder to guess/,
        code: 'REVERSE_DOESNT_HELP',
    },
    {
        regExp: /Predictable substitutions like \\'@\\' instead of \\'a\\' don\\'t help very much/,
        code: 'SUBSTITUTION_DOESNT_HELP',
    },
];

const parseMessage = (message) => {
    const matchedMessage = feedbackMessages.find((candidate) => candidate.regExp.test(message));

    if (matchedMessage) {
        return {
            code: matchedMessage.code,
            message: matchedMessage.message || message,
        };
    }

    /* istanbul ignore next */
    return {
        code: 'UNKNOWN',
        message,
    };
};

const checkPassphraseStrength = (passphrase) => {
    const { guesses_log10: guessesLog10, feedback } = zxcvbn(passphrase);

    const score = normalizeValue(guessesLog10, [
        { value: 0, norm: 0 },
        { value: 4, norm: 0.25 },
        { value: 9, norm: 0.5 },
        { value: 13, norm: 0.75 },
        { value: 18, norm: 0.9 },
        { value: 25, norm: 1 },
    ]);

    const suggestions = feedback.suggestions.map(parseMessage);
    const warning = feedback.warning ? parseMessage(feedback.warning) : null;

    // If the score is less than 50% and there's no warning nor suggestions, make sure we have one
    if (score < 0.5 && !warning && !suggestions.length) {
        suggestions.push({
            code: 'UNCOMMON_WORDS_ARE_BETTER',
            message: 'Add another word or two, uncommon words are better',
        });
    }

    return {
        score,
        warning,
        suggestions,
    };
};

export default checkPassphraseStrength;
