import React from "react";
import { Form, InputNumber, Card } from "antd";

export default function ProductShippingSection() {
  return (
    <Card 
      title={<span className="text-base font-semibold text-slate-800">Kích thước & Vận chuyển</span>}
      className="shadow-sm border border-slate-100 rounded-xl overflow-hidden mb-6"
      headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
    >
      <p className="text-slate-500 text-xs mb-4">
        Nhập thông tin kích thước và cân nặng chính xác của sản phẩm sau đóng gói để hệ thống tự động tính phí vận chuyển thông qua GHN API.
      </p>
      
      <div className="grid grid-cols-4 gap-4">
        {/* Length */}
        <div className="flex flex-col items-center bg-slate-50 border border-slate-100 rounded-xl p-3 hover:shadow-sm transition">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Chiều dài</span>
          <Form.Item 
            name="length" 
            rules={[{ required: true, message: 'Nhập Dài' }]}
            className="w-full mb-0"
          >
            <InputNumber 
              min={1} 
              className="w-full rounded-lg border-slate-200 font-semibold"
              placeholder="0"
              style={{ width: '100%' }}
              controls={false}
            />
          </Form.Item>
          <span className="text-xs font-semibold text-slate-400 mt-2">cm</span>
        </div>

        {/* Width */}
        <div className="flex flex-col items-center bg-slate-50 border border-slate-100 rounded-xl p-3 hover:shadow-sm transition">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Chiều rộng</span>
          <Form.Item 
            name="width" 
            rules={[{ required: true, message: 'Nhập Rộng' }]}
            className="w-full mb-0"
          >
            <InputNumber 
              min={1} 
              className="w-full rounded-lg border-slate-200 font-semibold"
              placeholder="0"
              style={{ width: '100%' }}
              controls={false}
            />
          </Form.Item>
          <span className="text-xs font-semibold text-slate-400 mt-2">cm</span>
        </div>

        {/* Height */}
        <div className="flex flex-col items-center bg-slate-50 border border-slate-100 rounded-xl p-3 hover:shadow-sm transition">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Chiều cao</span>
          <Form.Item 
            name="height" 
            rules={[{ required: true, message: 'Nhập Cao' }]}
            className="w-full mb-0"
          >
            <InputNumber 
              min={1} 
              className="w-full rounded-lg border-slate-200 font-semibold"
              placeholder="0"
              style={{ width: '100%' }}
              controls={false}
            />
          </Form.Item>
          <span className="text-xs font-semibold text-slate-400 mt-2">cm</span>
        </div>

        {/* Weight */}
        <div className="flex flex-col items-center bg-slate-50 border border-slate-100 rounded-xl p-3 hover:shadow-sm transition">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cân nặng</span>
          <Form.Item 
            name="weight" 
            rules={[{ required: true, message: 'Nhập Cân Nặng' }]}
            className="w-full mb-0"
          >
            <InputNumber 
              min={1} 
              className="w-full rounded-lg border-slate-200 font-semibold"
              placeholder="0"
              style={{ width: '100%' }}
              controls={false}
            />
          </Form.Item>
          <span className="text-xs font-semibold text-slate-400 mt-2">gram</span>
        </div>
      </div>
    </Card>
  );
}
