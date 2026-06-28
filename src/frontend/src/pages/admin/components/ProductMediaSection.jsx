import React from "react";
import { Upload, Button, Progress, Card } from "antd";
import { UploadOutlined, DeleteOutlined, InboxOutlined } from "@ant-design/icons";

export default function ProductMediaSection({
  fileList,
  setFileList,
  arGltfFileList,
  setArGltfFileList,
  arUsdzFileList,
  setArUsdzFileList,
  glbUploading,
  glbUploadProgress,
  handleGlbRemove,
  handleGlbBeforeUpload,
  saving
}) {
  return (
    <div className="space-y-6">
      {/* Product Images Card */}
      <Card
        title={<span className="text-base font-semibold text-slate-800">Hình ảnh sản phẩm</span>}
        className="shadow-sm border border-slate-100 rounded-xl overflow-hidden"
        headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
      >
        <div className="mb-4">
          <Upload.Dragger
            multiple={true}
            maxCount={5}
            fileList={fileList}
            showUploadList={false}
            disabled={saving}
            beforeUpload={(file) => {
              if (fileList.length >= 5) {
                return false;
              }
              setFileList(prev => [
                ...prev,
                {
                  uid: file.uid,
                  name: file.name,
                  status: "done",
                  url: URL.createObjectURL(file),
                  originFileObj: file
                }
              ]);
              return false;
            }}
          >
            <div className="p-4 flex flex-col items-center justify-center cursor-pointer">
              <InboxOutlined className="text-4xl text-blue-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Kéo thả ảnh hoặc click để chọn</p>
              <p className="text-xs text-slate-400 mt-1">Hỗ trợ tối đa 5 ảnh. Định dạng JPG, PNG, WEBP</p>
            </div>
          </Upload.Dragger>
        </div>

        {fileList.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Danh sách ảnh ({fileList.length}/5)</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {fileList.map((file) => (
                <div 
                  key={file.uid} 
                  className="group relative border border-slate-200 rounded-xl overflow-hidden aspect-square flex items-center justify-center bg-slate-50 shadow-sm transition hover:border-red-400"
                >
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFileList(fileList.filter(f => f.uid !== file.uid))}
                      className="text-white hover:text-red-500 p-1 hover:scale-110 transition"
                    >
                      <DeleteOutlined className="text-lg" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* AR / 3D Models Card */}
      <Card
        title={<span className="text-base font-semibold text-slate-800">Mô hình 3D & AR</span>}
        className="shadow-sm border border-slate-100 rounded-xl overflow-hidden"
        headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
      >
        {/* GLB File Upload */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Mô hình AR Web/Android (.glb)
          </label>
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
            showUploadList={{ showRemoveIcon: !saving && !glbUploading }}
          >
            {arGltfFileList.length < 1 && (
              <Button icon={<UploadOutlined />} loading={glbUploading} className="rounded-lg h-10">
                Tải lên file .glb
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

          {arGltfFileList.length > 0 && arGltfFileList[0]?.url && (
            <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col items-center justify-center p-2 relative" style={{ height: 180 }}>
              <model-viewer
                src={arGltfFileList[0].url}
                auto-rotate
                camera-controls
                style={{ width: '100%', height: '100%', borderRadius: '12px' }}
              ></model-viewer>
              
              {!arGltfFileList[0]?.originFileObj && (
                <div className="absolute bottom-2 left-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded-lg text-[10px] text-slate-600 truncate shadow-sm border border-slate-100">
                  Đang sử dụng: {arGltfFileList[0].url}
                </div>
              )}
            </div>
          )}
        </div>

        {/* USDZ File Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Mô hình AR iOS (.usdz)
          </label>
          <Upload
            fileList={arUsdzFileList}
            maxCount={1}
            accept=".usdz"
            disabled={saving}
            onRemove={() => setArUsdzFileList([])}
            beforeUpload={(file) => {
              setArUsdzFileList([
                { 
                  uid: file.uid, 
                  name: file.name, 
                  status: "done", 
                  url: URL.createObjectURL(file), 
                  originFileObj: file 
                }
              ]);
              return false;
            }}
          >
            {arUsdzFileList.length < 1 && (
              <Button icon={<UploadOutlined />} className="rounded-lg h-10">
                Tải lên file .usdz
              </Button>
            )}
          </Upload>
          
          {arUsdzFileList.length > 0 && arUsdzFileList[0]?.url && (
            <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex items-center justify-between text-xs text-slate-600">
              <span className="truncate font-mono font-medium max-w-[80%]">
                {arUsdzFileList[0].name}
              </span>
              {!arUsdzFileList[0]?.originFileObj && (
                <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                  ĐÃ LƯU
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
