import { useState, useEffect, useContext } from "react";
import {
  Table,
  Input,
  Button,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  InputNumber,
  Select,
  Upload,
  Row,
  Col,
  Card,
  Typography,
  Image,
  Tooltip,
  Progress,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  PlusOutlined,
  UploadOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../context/AuthContext";
import Cookies from "js-cookie";
import '@google/model-viewer'; // Import model-viewer cho AR Preview
import api from "../../config/api";

const { Title } = Typography;
const GLB_UPLOAD_ENDPOINT = "/api/upload/models/glb";
const MAX_GLB_SIZE_MB = 100;

export default function ProductManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  
  const [filterCategoryId, setFilterCategoryId] = useState(null); 

  const [editingProduct, setEditingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [fileList, setFileList] = useState([]); // Chứa nhiều ảnh
  const [arGltfFileList, setArGltfFileList] = useState([]); // Chứa AR Model .glb
  const [arUsdzFileList, setArUsdzFileList] = useState([]); // Chứa AR Model .usdz
  const [saving, setSaving] = useState(false);
  const [glbUploading, setGlbUploading] = useState(false);
  const [glbUploadProgress, setGlbUploadProgress] = useState(0);

  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const token = Cookies.get("jwt");
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user || !token) return;
    if (user.role !== "ADMIN") {
      messageApi.error("Bạn không có quyền truy cập trang này!");
      return;
    }
    fetchProducts();
    fetchCategories();
  }, [user, token]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/products");
      setProducts(res.data);
    } catch (err) {
      console.error("API Error:", err);
      messageApi.error("Không thể tải danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/api/categories");
      setCategories(res.data);
    } catch (err) {
      console.error("API Error:", err);
      messageApi.error("Không thể tải danh mục");
    }
  };

  const uploadToSupabase = async (file) => {
    const data = new FormData();
    data.append("file", file);

    try {
      const res = await api.post("/api/upload/image", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (!res.data.url) throw new Error("Upload failed");
      return res.data.url;
    } catch (err) {
      console.error("Supabase Error:", err);
      throw new Error("Upload failed to Supabase");
    }
  };

  const getUploadErrorMessage = (err, fallback) => {
    return err?.response?.data?.message || err?.response?.data?.error || fallback;
  };

  const uploadGlbModelToBackend = async (file) => {
    const data = new FormData();
    data.append("file", file);

    setGlbUploading(true);
    setGlbUploadProgress(0);

    try {
      const res = await api.post(GLB_UPLOAD_ENDPOINT, data, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (!event.total) return;
          setGlbUploadProgress(Math.round((event.loaded * 100) / event.total));
        },
      });

      if (!res.data?.url) {
        throw new Error("Backend did not return a model URL");
      }

      setGlbUploadProgress(100);
      return res.data.url;
    } catch (err) {
      console.error("GLB Upload Error:", err);
      throw new Error(getUploadErrorMessage(err, "3D model upload failed"));
    } finally {
      setGlbUploading(false);
    }
  };

  const handleGlbBeforeUpload = (file) => {
    const isGlb = file.name?.toLowerCase().endsWith(".glb");
    if (!isGlb) {
      messageApi.error("Only .glb files are supported for web/Android AR");
      return Upload.LIST_IGNORE;
    }

    const isWithinSizeLimit = file.size <= MAX_GLB_SIZE_MB * 1024 * 1024;
    if (!isWithinSizeLimit) {
      messageApi.error(`.glb file must be ${MAX_GLB_SIZE_MB}MB or smaller`);
      return Upload.LIST_IGNORE;
    }

    setGlbUploadProgress(0);
    setArGltfFileList([{
      uid: file.uid,
      name: file.name,
      status: "done",
      url: URL.createObjectURL(file),
      originFileObj: file,
    }]);
    return false;
  };

  const handleGlbRemove = () => {
    if (saving || glbUploading) {
      return false;
    }

    setGlbUploadProgress(0);
    setArGltfFileList([]);
    return true;
  };

  const uploadArFileToBackend = async (file) => {
    const data = new FormData();
    data.append("file", file);

    try {
      const res = await api.post("/api/upload/ar", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (!res.data.url) throw new Error("Upload failed to backend");
      return res.data.url;
    } catch (err) {
      console.error("Backend Error:", err);
      throw new Error("Upload failed to backend");
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    setFileList([]);
    setArGltfFileList([]);
    setArUsdzFileList([]);
    setGlbUploadProgress(0);
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingProduct(record);
    form.setFieldsValue(record);
    setGlbUploadProgress(0);
    
    if (record.imageUrls && record.imageUrls.length > 0) {
      setFileList(record.imageUrls.map((url, i) => ({
        uid: `-${i}`, name: `image-${i}.png`, status: "done", url: url
      })));
    } else {
      setFileList([]);
    }

    if (record.arLink) {
      setArGltfFileList([{ uid: '-gltf', name: 'model.glb', status: "done", url: record.arLink }]);
    } else setArGltfFileList([]);
    
    if (record.arModelUsdz) {
      setArUsdzFileList([{ uid: '-usdz', name: 'model.usdz', status: "done", url: record.arModelUsdz }]);
    } else setArUsdzFileList([]);

    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/products/${id}`);
      messageApi.success("Xóa sản phẩm thành công");
      fetchProducts();
    } catch (err) {
      console.error("API Error:", err);
      messageApi.error("Không thể xóa sản phẩm");
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const values = await form.validateFields();
      
      const newFiles = fileList.filter(f => f.originFileObj).map(f => f.originFileObj);
      const existingUrls = fileList.filter(f => !f.originFileObj).map(f => f.url);

      let newUrls = [];
      if (newFiles.length > 0) {
        messageApi.open({
          type: "loading",
          content: "Đang tải ảnh sản phẩm lên Cloud...",
        });
        newUrls = await Promise.all(newFiles.map(file => uploadToSupabase(file)));
        messageApi.destroy();
      }

      // Xử lý upload AR files
      let arLink = editingProduct?.arLink || "";
      let arModelUsdz = editingProduct?.arModelUsdz || "";

      const newGltfFile = arGltfFileList.find(f => f.originFileObj)?.originFileObj;
      if (newGltfFile) {
        setArGltfFileList(prev => prev.map(file =>
          file.originFileObj === newGltfFile ? { ...file, status: "uploading", percent: glbUploadProgress } : file
        ));
        messageApi.open({
          key: "glb-upload",
          type: "loading",
          content: "Uploading .glb model to Supabase Storage...",
          duration: 0,
        });
        arLink = await uploadGlbModelToBackend(newGltfFile);
        setArGltfFileList(prev => prev.map(file =>
          file.originFileObj === newGltfFile
            ? { ...file, status: "done", percent: 100, url: arLink, originFileObj: undefined }
            : file
        ));
        messageApi.open({
          key: "glb-upload",
          type: "success",
          content: ".glb model uploaded",
          duration: 2,
        });
      } else if (arGltfFileList.length === 0) {
        arLink = "";
      } else {
        arLink = arGltfFileList.find(f => !f.originFileObj)?.url || arLink;
      }

      const newUsdzFile = arUsdzFileList.find(f => f.originFileObj)?.originFileObj;
      if (newUsdzFile) {
        messageApi.open({ type: "loading", content: "Đang tải file 3D (.usdz) lên server..." });
        arModelUsdz = await uploadArFileToBackend(newUsdzFile);
        messageApi.destroy();
      } else if (arUsdzFileList.length === 0) {
        arModelUsdz = "";
      }

      const imageUrls = [...existingUrls, ...newUrls];
      const sizeValue = values.length && values.width && values.height
        ? `${values.length}x${values.width}x${values.height} cm`
        : values.size;
      const payload = { ...values, size: sizeValue, imageUrls, arLink, arModelUsdz };
      const method = editingProduct ? "put" : "post";
      const url = editingProduct
        ? `/api/products/${editingProduct.productId}`
        : "/api/products";

      await api[method](url, payload);

      messageApi.success(
        editingProduct ? "Cập nhật thành công" : "Thêm sản phẩm thành công"
      );
      setIsModalOpen(false);
      fetchProducts();
    } catch (e) {
      console.error("API Error:", e);
      messageApi.destroy();
      setArGltfFileList(prev => prev.map(file =>
        file.status === "uploading" ? { ...file, status: "error" } : file
      ));
      messageApi.open({
        key: "glb-upload",
        type: "error",
        content: e?.message || "Save failed, please check the form again",
        duration: 4,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (val) => setSearchText(val.toLowerCase());

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.productName?.toLowerCase().includes(searchText) ||
      p.description?.toLowerCase().includes(searchText);
    
    const matchCategory = filterCategoryId 
      ? p.categoryId === filterCategoryId 
      : true;

    return matchSearch && matchCategory;
  });

  const columns = [
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      width: 300,
      render: (text, record) => (
        <div className="flex gap-3">
          <Image
            width={50}
            height={50}
            src={record.imageUrls?.[0] || "https://via.placeholder.com/50"}
            className="rounded object-cover"
            fallback="https://via.placeholder.com/50"
          />
          <div>
            <div className="font-medium line-clamp-2">{text}</div>
            <div className="text-xs text-gray-500 font-mono">
              {record.productId}
            </div>
            {record.arLink && (
              <span className="text-xs text-purple-600 bg-purple-100 px-1 rounded border border-purple-200 mt-1 inline-block">Hỗ trợ AR</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Giá bán",
      dataIndex: "price",
      width: 120,
      render: (v) => (
        <span className="font-semibold">{v?.toLocaleString("vi-VN")} ₫</span>
      ),
    },
    { title: "Kho", dataIndex: "quantity", width: 80, align: "center" },
    {
      title: "Giảm",
      dataIndex: "discount",
      width: 80,
      align: "center",
      render: (v) =>
        v > 0 ? <span className="text-red-500 font-bold">-{v}%</span> : "-",
    },
    { title: "Bảo hành", dataIndex: "warranty", responsive: ["lg"] },
    {
      title: "",
      fixed: "right",
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="Sửa">
            <Button
              type="text"
              icon={<EditOutlined className="text-blue-600" />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa sản phẩm này?"
            onConfirm={() => handleDelete(record.productId)}
          >
            <Tooltip title="Xóa">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      {contextHolder}
      <Card bordered={false} className="shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Quản lý sản phẩm
            </Title>
            <div className="text-gray-500 text-sm">
              Hiển thị {filteredProducts.length} / {products.length} sản phẩm
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Select
              placeholder="Lọc theo danh mục"
              style={{ width: 200 }}
              allowClear
              onChange={(value) => setFilterCategoryId(value)}
              options={categories.map((c) => ({
                label: c.categoryName,
                value: c.categoryId,
              }))}
              suffixIcon={<FilterOutlined />}
            />

            <Input
              placeholder="Tìm tên sản phẩm..."
              prefix={<SearchOutlined />}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full sm:w-64"
            />
            <Button icon={<ReloadOutlined />} onClick={fetchProducts} />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              className="bg-blue-600"
            >
              Thêm mới
            </Button>
          </div>
        </div>

        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          dataSource={filteredProducts}
          columns={columns}
          rowKey="productId"
          loading={loading}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => {
          if (!saving && !glbUploading) setIsModalOpen(false);
        }}
        confirmLoading={saving}
        width={800}
        okText="Lưu"
        cancelText="Hủy"
        centered
      >
        <Form form={form} layout="vertical" className="pt-4">
          <Row gutter={16}>
            <Col span={24} md={16}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="productName"
                    label="Tên sản phẩm"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="productId"
                    label="Mã SP"
                    rules={[{ required: true }]}
                  >
                    <Input disabled={!!editingProduct} className="font-mono" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="price"
                    label="Giá"
                    rules={[{ required: true }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="quantity"
                    label="Số lượng"
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="discount" label="Giảm giá (%)">
                    <InputNumber min={0} max={100} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="categoryId"
                    label="Danh mục"
                    rules={[{ required: true }]}
                  >
                    <Select
                      options={categories.map((c) => ({
                        label: c.categoryName,
                        value: c.categoryId,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="warranty" label="Bảo hành">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="description" label="Mô tả">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </Col>
              </Row>
            </Col>

            <Col span={24} md={8}>
              <Form.Item label="Hình ảnh (Max 5 ảnh)">
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  multiple={true}
                  maxCount={5}
                  onRemove={(file) => {
                    setFileList(fileList.filter(f => f.uid !== file.uid));
                  }}
                  beforeUpload={(file, fileListArg) => {
                    setFileList(prev => [
                      ...prev,
                      { uid: file.uid, name: file.name, status: "done", url: URL.createObjectURL(file), originFileObj: file }
                    ]);
                    return false;
                  }}
                >
                  {fileList.length < 5 && (
                    <div className="flex flex-col items-center">
                      <UploadOutlined />
                      <div className="mt-2 text-xs">Upload</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
              
              <Form.Item label="Mô hình AR Web/Android (.glb)">
                <Upload
                  fileList={arGltfFileList.map(file =>
                    file.originFileObj && glbUploading
                      ? { ...file, status: "uploading", percent: glbUploadProgress }
                      : file
                  )}
                  maxCount={1}
                  accept=".glb,model/gltf-binary"
                  disabled={saving || glbUploading}
                  onRemove={handleGlbRemove}
                  beforeUpload={handleGlbBeforeUpload}
                >
                  {arGltfFileList.length < 1 && (
                    <Button icon={<UploadOutlined />} loading={glbUploading}>
                      Tai len file .glb
                    </Button>
                  )}
                </Upload>
                {glbUploading && (
                  <Progress
                    className="mt-2"
                    percent={glbUploadProgress}
                    size="small"
                    status="active"
                  />
                )}
                {arGltfFileList.length > 0 && (
                  <div className="mt-3 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center p-2" style={{height: 150}}>
                     <model-viewer
                        src={arGltfFileList[0].url}
                        auto-rotate
                        camera-controls
                        style={{width: '100%', height: '100%'}}
                     ></model-viewer>
                  </div>
                )}
                {(arGltfFileList[0]?.url && !arGltfFileList[0]?.originFileObj) && (
                   <div className="mt-2 text-xs text-green-600 truncate break-all">Đã lưu: {arGltfFileList[0].url}</div>
                )}
              </Form.Item>

              <Form.Item label="Mô hình AR iOS (.usdz)">
                <Upload
                  fileList={arUsdzFileList}
                  maxCount={1}
                  accept=".usdz"
                  onRemove={() => setArUsdzFileList([])}
                  beforeUpload={(file) => {
                    setArUsdzFileList([{ uid: file.uid, name: file.name, status: "done", url: URL.createObjectURL(file), originFileObj: file }]);
                    return false;
                  }}
                >
                  {arUsdzFileList.length < 1 && (
                    <Button icon={<UploadOutlined />}>Tải lên file .usdz</Button>
                  )}
                </Upload>
                {(arUsdzFileList[0]?.url && !arUsdzFileList[0]?.originFileObj) && (
                   <div className="mt-2 text-xs text-green-600 truncate break-all">Đã lưu: {arUsdzFileList[0].url}</div>
                )}
              </Form.Item>

              <Form.Item name="color" label="Màu sắc" className="mt-2">
                <Input />
              </Form.Item>
              <Row gutter={8}>
                <Col span={6}>
                  <Form.Item name="length" label="Dài (cm)" rules={[{ required: true, message: 'Nhập Dài' }]}>
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="cm" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="width" label="Rộng (cm)" rules={[{ required: true, message: 'Nhập Rộng' }]}>
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="cm" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="height" label="Cao (cm)" rules={[{ required: true, message: 'Nhập Cao' }]}>
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="cm" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="weight" label="Nặng (g)" rules={[{ required: true, message: 'Nhập Cân Nặng' }]}>
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="g" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="material" label="Chất liệu">
                <Input />
              </Form.Item>
              <Form.Item name="origin" label="Xuất xứ">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
