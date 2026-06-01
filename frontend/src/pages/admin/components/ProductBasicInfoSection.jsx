import React from "react";
import { Form, Input, InputNumber, Select, Card } from "antd";

export default function ProductBasicInfoSection({ categories, editingProduct }) {
  return (
    <Card 
      title={<span className="text-base font-semibold text-slate-800">Thông tin cơ bản</span>}
      className="shadow-sm border border-slate-100 rounded-xl overflow-hidden mb-6"
      headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tên sản phẩm</label>
          <Form.Item
            name="productName"
            rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm!" }]}
            className="mb-0"
          >
            <Input className="h-10 rounded-lg hover:border-blue-400 focus:border-blue-500 focus:shadow-sm" placeholder="Nhập tên sản phẩm..." />
          </Form.Item>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mã sản phẩm (SKU)</label>
          <Form.Item
            name="productId"
            rules={[{ required: true, message: "Vui lòng nhập mã sản phẩm!" }]}
            className="mb-0"
          >
            <Input 
              disabled={!!editingProduct} 
              className="h-10 rounded-lg font-mono hover:border-blue-400 focus:border-blue-500 focus:shadow-sm disabled:bg-slate-50 disabled:text-slate-400" 
              placeholder="Ví dụ: SP001"
            />
          </Form.Item>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Danh mục</label>
          <Form.Item
            name="categoryId"
            rules={[{ required: true, message: "Vui lòng chọn danh mục!" }]}
            className="mb-0"
          >
            <Select
              className="h-10 rounded-lg w-full"
              placeholder="Chọn danh mục"
              options={categories.map((c) => ({
                label: c.categoryName,
                value: c.categoryId,
              }))}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Giá bán (₫)</label>
            <Form.Item
              name="price"
              rules={[{ required: true, message: "Nhập giá!" }]}
              className="mb-0"
            >
              <InputNumber
                min={0}
                className="w-full rounded-lg hover:border-blue-400 focus:border-blue-500 focus:shadow-sm"
                style={{ height: '40px', display: 'flex', alignItems: 'center' }}
                placeholder="0"
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
              />
            </Form.Item>
          </div>

          <div className="col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Giảm giá (%)</label>
            <Form.Item name="discount" className="mb-0">
              <InputNumber 
                min={0} 
                max={100} 
                className="w-full rounded-lg hover:border-blue-400 focus:border-blue-500 focus:shadow-sm" 
                style={{ height: '40px', display: 'flex', alignItems: 'center' }}
                placeholder="0"
              />
            </Form.Item>
          </div>

          <div className="col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Số lượng</label>
            <Form.Item
              name="quantity"
              rules={[{ required: true, message: "Nhập số lượng!" }]}
              className="mb-0"
            >
              <InputNumber 
                min={0} 
                className="w-full rounded-lg hover:border-blue-400 focus:border-blue-500 focus:shadow-sm" 
                style={{ height: '40px', display: 'flex', alignItems: 'center' }}
                placeholder="0"
              />
            </Form.Item>
          </div>
        </div>
      </div>
    </Card>
  );
}
