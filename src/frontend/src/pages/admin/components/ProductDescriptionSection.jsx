import React from "react";
import { Form, Input, Card } from "antd";

export default function ProductDescriptionSection() {
  return (
    <Card 
      title={<span className="text-base font-semibold text-slate-800">Mô tả sản phẩm</span>}
      className="shadow-sm border border-slate-100 rounded-xl overflow-hidden mb-6"
      headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
    >
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mô tả chi tiết</label>
      <Form.Item name="description" className="mb-0">
        <Input.TextArea 
          autoSize={{ minRows: 4, maxRows: 10 }}
          className="rounded-lg border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:shadow-sm p-3 text-sm" 
          placeholder="Mô tả sản phẩm chi tiết..."
        />
      </Form.Item>
    </Card>
  );
}
