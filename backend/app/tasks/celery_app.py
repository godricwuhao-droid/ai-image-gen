"""
Celery 应用配置模块

此模块负责：
1. 配置日志系统，避免重复打印
2. 初始化 Celery 应用并连接 Redis 作为消息队列
3. 设置任务序列化格式和超时时间
4. 自动发现 tasks 模块中的任务
"""
    
import logging
import sys

for logger_name in ['', 'celery', 'celery.task', 'celery.worker', 'celery.apps.worker', 'celery.worker.consumer', 'app', 'app.api.v1.endpoints.image.image_to_image', 'app.services.provider.relay_provider']:
    _logger = logging.getLogger(logger_name)
    _logger.setLevel(logging.INFO)
    _logger.handlers.clear()
    _logger.propagate = False
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    _logger.addHandler(handler)

from celery import Celery
from app.core.config import settings

# 创建 Celery 实例，连接 Redis 作为消息代理和结果存储
celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,       # Redis URL，用于任务队列
    backend=settings.CELERY_RESULT_BACKEND,  # Redis URL，用于存储任务结果
)

# 配置 Celery 行为
celery_app.conf.update(
    task_serializer="json",          # 任务序列化为 JSON 格式
    accept_content=["json"],         # 只接受 JSON 格式的任务
    result_serializer="json",       # 结果序列化为 JSON 格式
    timezone="UTC",                  # 使用 UTC 时区
    enable_utc=True,                # 启用 UTC 时间
    task_track_started=True,        # 跟踪任务开始状态
    task_time_limit=300,           # 任务超时时间 5 分钟
    worker_hijack_root_logger=False, # 不劫持根日志器，避免重复日志
)

# 自动发现 app.tasks 模块中的任务
celery_app.autodiscover_tasks(["app.tasks"])

# 确保 image_edit_task 被加载到当前模块
from app.tasks.image_edit_task import process_image_edit
