// Core
import React from 'react';
import classNames from 'classnames';
import hljs from 'highlight.js';
import ReactQuill, { Quill, Mixin } from 'react-quill';

// Styles
import styles from './TextEditor.less';

// Icons
import IconHeader3 from 'quill/assets/icons/header-3.svg';
import IconHorizontalRule from 'quill/assets/icons/horizontal-rule.svg';
import IconAlignLeft from 'quill/assets/icons/align-left.svg';
import IconAlignCenter from 'quill/assets/icons/align-center.svg';
import IconAlignRight from 'quill/assets/icons/align-right.svg';

import IconTrash from 'assets/trash-2.svg';
import IconUploadCloud from 'assets/upload-cloud.svg';

// Import vendor CSS
import 'react-quill/dist/quill.snow.css';
import 'highlight.js/styles/monokai-sublime.css';

hljs.configure({
    // optionally configure hljs
    languages: ['javascript', 'ruby', 'python', 'swift', 'http', 'css', 'json']
});

const Delta = Quill.import('delta');
const BlockEmbed = Quill.import('blots/block/embed');
const Keyboard = Quill.import('modules/keyboard');
const Font = Quill.import('formats/font');

class DividerBlot extends BlockEmbed {}
DividerBlot.blotName = 'divider';
DividerBlot.tagName = 'hr';

Quill.register(DividerBlot);

Font.whitelist = ['montserrat', 'lora', 'opensans'];
Quill.register(Font, true);

const formats = [
    'header',
    'font',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'list',
    'bullet',
    'indent',
    'link',
    'image',
    'color',
    'divider',
    'align',
    'code-block',
    'code'
];

const Toolbar = props => {
    const { onDeleteClick, ...otherProps } = props;
    return (
        <div {...otherProps}>
            <button className="ql-header" value="2" />
            <button className="ql-header" value="3">
                <IconHeader3 />
            </button>
            <button className="ql-bold" />
            <button className="ql-italic" />
            <button className="ql-code-block" />
            <button className="ql-blockquote" />
            <button className="ql-alignLeft">
                <IconAlignLeft />
            </button>
            <button className="ql-alignCenter">
                <IconAlignCenter />
            </button>
            <button className="ql-alignRight">
                <IconAlignRight />
            </button>
            <button type="button" className="ql-list" value="ordered" />
            <button type="button" className="ql-list" value="bullet" />
            <button className="ql-insertHr">
                <IconHorizontalRule />
            </button>
            <button className="ql-clean" />
            <span className={styles['te-spacer']} />
            <button onClick={onDeleteClick}>
                <IconTrash />
            </button>
        </div>
    );
};

class TextEditor extends React.Component {
    quillRef = React.createRef();

    get editorType() {
        return 'quill';
    }

    getHTML() {
        const quill = this.getEditor();
        return quill ? Mixin.makeUnprivilegedEditor(quill).getHTML() : null;
    }

    getDelta() {
        const quill = this.getEditor();
        return quill ? quill.getContents() : null;
    }

    getJSON() {
        const delta = this.getDelta();
        if (!delta) {
            return null;
        }

        return {
            editor: this.editorType,
            ops: delta.map(op => Object.assign({}, op))
        };
    }

    getJSONString() {
        const json = this.getJSON();
        return json ? JSON.stringify(json) : null;
    }

    getEditor() {
        if (!this.quillRef.current) {
            return;
        }
        return this.quillRef.current.getEditor();
    }

    InsertHr = () => {
        const quill = this.getEditor();
        if (!quill) {
            return;
        }

        let range = quill.getSelection(true);
        let index = range ? range.index || 0 : 0;
        const [block] = quill.getLine(range.index);
        const emptyPara =
            block.length() == 0 ||
            (block.length() == 1 &&
                block.children.head.domNode.tagName === 'BR');
        if (emptyPara) {
            quill.insertText(index++, '\n', Quill.sources.USER);
        }
        quill.insertEmbed(index, 'divider', true, Quill.sources.USER);
        quill.setSelection(index + 2, Quill.sources.SILENT);
    };

    getTextAlignment = align => () => {
        const quill = this.getEditor();
        if (!quill) {
            return;
        }

        quill.format('align', align);
    };

    // Handlers
    onContainerClick = e => {
        if (e.target !== e.currentTarget) {
            return;
        }

        const quill = this.getEditor();
        if (quill) {
            quill.focus();
            quill.setSelection(quill.getLength() - 1, Quill.sources.SILENT);
        }
    };

    // Render
    render() {
        const { className, onDeleteClick, ...passThroughProps } = this.props;

        const scrollingContainerId = `te-sc-${Date.now()}`;
        const toolbarId = `te-tb-${Date.now()}`;

        return (
            <div className={classNames(styles['te-wrapper'], className)}>
                <Toolbar
                    onDeleteClick={onDeleteClick}
                    className={styles['te-toolbar']}
                    id={toolbarId}
                />
                <div
                    id={scrollingContainerId}
                    className={classNames(styles['te-container'], 'editor')}
                    onClick={this.onContainerClick}
                >
                    <ReactQuill
                        ref={this.quillRef}
                        className={styles['te-editor']}
                        preserveWhitespace={true}
                        formats={formats}
                        modules={{
                            syntax: {
                                highlight: function(text) {
                                    let result = hljs.highlightAuto(text);
                                    return result.value;
                                }
                            },
                            keyboard: {
                                bindings: {
                                    'no tab': {
                                        key: Keyboard.keys.TAB,
                                        shiftKey: null,
                                        handler: () => false
                                    },
                                    'divider autofill': {
                                        key: Keyboard.keys.ENTER,
                                        collapsed: !0,
                                        prefix: /^([-*])\1{2,}$/,
                                        handler: function(range) {
                                            const keyboard = this;
                                            const quill = keyboard.quill;
                                            const line = quill.getLine(
                                                range.index
                                            );
                                            const block = line[0];

                                            if (
                                                block &&
                                                'P' == block.domNode.tagName
                                            ) {
                                                const blockOffset = quill.getIndex(
                                                    block
                                                );

                                                const index = new Delta()
                                                    .retain(blockOffset)
                                                    .delete(block.length())
                                                    .insert({
                                                        divider: false
                                                    });

                                                if (!block.next) {
                                                    index.insert('\n');
                                                }

                                                quill.updateContents(
                                                    index,
                                                    Quill.sources.USER
                                                );
                                            }
                                            return false;
                                        }
                                    }
                                }
                            },
                            toolbar: {
                                container: `#${toolbarId}`,
                                handlers: {
                                    insertHr: this.InsertHr,
                                    alignLeft: this.getTextAlignment(''),
                                    alignCenter: this.getTextAlignment(
                                        'center'
                                    ),
                                    alignRight: this.getTextAlignment('right')
                                }
                            }
                        }}
                        scrollingContainer={`#${scrollingContainerId}`}
                        {...passThroughProps}
                    />
                </div>
            </div>
        );
    }
}

export default TextEditor;
