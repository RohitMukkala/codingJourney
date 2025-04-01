import { ResumeInfoContext } from "@/context/ResumeInfoContext";
import React, { useContext, useState } from "react";
import {
  BtnBold,
  BtnBulletList,
  BtnItalic,
  BtnNumberedList,
  BtnStrikeThrough,
  BtnUnderline,
  Editor,
  EditorProvider,
  Separator,
  Toolbar,
} from "react-simple-wysiwyg";
import DOMPurify from "dompurify";

function RichTextEditor({ onRichTextEditorChange, defaultValue }) {
  const [value, setValue] = useState(defaultValue || ""); // Ensure default value is a string
  const { resumeInfo } = useContext(ResumeInfoContext);

  const handleEditorChange = (e) => {
    const sanitizedValue = DOMPurify.sanitize(e.target.value);
    setValue(sanitizedValue);
    onRichTextEditorChange(sanitizedValue); // Pass only the string value
  };

  return (
    <div className="my-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Work Summary</span>
      </div>

      <EditorProvider>
        <Editor
          value={value}
          onChange={handleEditorChange}
          className="border rounded-md p-2 min-h-[150px]"
        >
          <Toolbar className="border-b p-1 gap-1">
            <BtnBold />
            <BtnItalic />
            <BtnUnderline />
            <BtnStrikeThrough />
            <Separator />
            <BtnNumberedList />
            <BtnBulletList />
          </Toolbar>
        </Editor>
      </EditorProvider>
    </div>
  );
}

export default RichTextEditor;
