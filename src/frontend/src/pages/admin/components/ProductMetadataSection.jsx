import React from "react";
import { Form, Input, Card } from "antd";

export default function ProductMetadataSection() {
  return (
    <Card 
      title={<span className="text-base font-semibold text-slate-800">Thông tin bổ sung (Thuộc tính)</span>}
      className="shadow-sm border border-slate-100 rounded-xl overflow-hidden mb-6"
      headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Màu sắc</label>
          <Form.Item name="color" className="mb-0">
            <Input className="h-10 rounded-lg hover:border-blue-400 focus:border-blue-500 focus:shadow-sm" placeholder="Màu sắc (ví dụ: Nâu gỗ, Đen nhám...)" />
          </Form.Item>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Chất liệu</label>
          <Form.Item name="material" className="mb-0">
            <Input className="h-10 rounded-lg hover:border-blue-400 focus:border-blue-500 focus:shadow-sm" placeholder="Chất liệu (ví dụ: Gỗ sồi, Da công nghiệp...)" />
          </Form.Item>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Xuất xứ</label>
          <Form.Item name="origin" className="mb-0">
            <Input className="h-10 rounded-lg hover:border-blue-400 focus:border-blue-500 focus:shadow-sm" placeholder="Xuất xứ (ví dụ: Việt Nam, Nhập khẩu...)" />
          </Form.Item>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Thời hạn bảo hành</label>
          <Form.Item name="warranty" className="mb-0">
            <Input className="h-10 rounded-lg hover:border-blue-400 focus:border-blue-500 focus:shadow-sm" placeholder="Bảo hành (ví dụ: 12 tháng, 2 năm...)" />
          </Form.Item>
        </div>
      </div>
    </Card>
  );
}
