#!/usr/bin/env python3
"""
🗄️ DATABASE MIGRATION - CAPTCHA INTELLIGENCE
=============================================
Alembic migration to create all intelligence tables

Run with:
    alembic revision --autogenerate -m "Add CAPTCHA Intelligence"
    alembic upgrade head
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'captcha_intelligence_v1'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Create all CAPTCHA Intelligence tables"""
    
    # Table 1: CAPTCHA Types
    op.create_table(
        'captcha_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('difficulty', sa.Integer(), default=1),
        sa.Column('provider', sa.String(100)),
        sa.Column('detection_patterns', postgresql.JSON()),
        sa.Column('solving_strategy', sa.String(50)),
        sa.Column('avg_solve_time', sa.Float()),
        sa.Column('success_rate', sa.Float()),
        sa.Column('last_seen', sa.DateTime()),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('detection_signatures', postgresql.JSON()),
        sa.Column('evasion_techniques', postgresql.JSON()),
        sa.Column('total_samples', sa.Integer(), default=0),
        sa.Column('labeled_samples', sa.Integer(), default=0),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Table 2: Training Data
    op.create_table(
        'captcha_training_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('captcha_type_id', sa.Integer(), nullable=False),
        sa.Column('screenshot', sa.LargeBinary()),
        sa.Column('screenshot_hash', sa.String(64)),
        sa.Column('solution', sa.Text()),
        sa.Column('solution_type', sa.String(50)),
        sa.Column('url_source', sa.Text()),
        sa.Column('difficulty_rating', sa.Integer()),
        sa.Column('solve_method', sa.String(50)),
        sa.Column('solver_used', sa.String(50)),
        sa.Column('solve_time_ms', sa.Integer()),
        sa.Column('confidence_score', sa.Float()),
        sa.Column('was_correct', sa.Boolean()),
        sa.Column('dom_snapshot', postgresql.JSON()),
        sa.Column('network_requests', postgresql.JSON()),
        sa.Column('javascript_challenges', postgresql.JSON()),
        sa.Column('collected_at', sa.DateTime()),
        sa.Column('verified_at', sa.DateTime()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('screenshot_hash')
    )
    
    # Table 3: Anti-Detection Signatures
    op.create_table(
        'anti_detection_signatures',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('detection_type', sa.String(100), nullable=False),
        sa.Column('severity', sa.String(20)),
        sa.Column('detection_method', sa.Text()),
        sa.Column('trigger_conditions', postgresql.JSON()),
        sa.Column('evasion_method', sa.Text()),
        sa.Column('evasion_code', sa.Text()),
        sa.Column('success_rate', sa.Float()),
        sa.Column('detected_scenarios', postgresql.JSON()),
        sa.Column('successful_evasions', postgresql.JSON()),
        sa.Column('source', sa.String(100)),
        sa.Column('confidence', sa.Float()),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Table 4: Solve Attempts (Real-time tracking)
    op.create_table(
        'captcha_solve_attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('worker_id', sa.String(50)),
        sa.Column('captcha_type_id', sa.Integer()),
        sa.Column('screenshot_hash', sa.String(64)),
        sa.Column('detected_type', sa.String(100)),
        sa.Column('detection_confidence', sa.Float()),
        sa.Column('solver_strategy', sa.String(50)),
        sa.Column('primary_solver', sa.String(50)),
        sa.Column('fallback_solvers', postgresql.JSON()),
        sa.Column('solution_provided', sa.Text()),
        sa.Column('solve_time_ms', sa.Integer()),
        sa.Column('was_successful', sa.Boolean()),
        sa.Column('error_message', sa.Text()),
        sa.Column('response_time_api', sa.Integer()),
        sa.Column('response_time_browser', sa.Integer()),
        sa.Column('response_time_total', sa.Integer()),
        sa.Column('target_url', sa.Text()),
        sa.Column('user_agent', sa.Text()),
        sa.Column('proxy_used', sa.String(100)),
        sa.Column('feedback_score', sa.Float()),
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('attempted_at', sa.DateTime()),
        sa.Column('verified_at', sa.DateTime()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Table 5: CAPTCHA Providers
    op.create_table(
        'captcha_providers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100)),
        sa.Column('detection_domains', postgresql.JSON()),
        sa.Column('api_endpoints', postgresql.JSON()),
        sa.Column('javascript_libraries', postgresql.JSON()),
        sa.Column('common_challenges', postgresql.JSON()),
        sa.Column('difficulty_curve', postgresql.JSON()),
        sa.Column('rate_limiting', postgresql.JSON()),
        sa.Column('fingerprinting_methods', postgresql.JSON()),
        sa.Column('behavioral_analysis', postgresql.JSON()),
        sa.Column('machine_learning_detection', postgresql.JSON()),
        sa.Column('bypass_techniques', postgresql.JSON()),
        sa.Column('success_rate', sa.Float()),
        sa.Column('last_update_check', sa.DateTime()),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create indices for performance
    op.create_index('idx_training_hash', 'captcha_training_data', ['screenshot_hash'])
    op.create_index('idx_attempts_worker', 'captcha_solve_attempts', ['worker_id'])
    op.create_index('idx_attempts_type', 'captcha_solve_attempts', ['detected_type'])
    op.create_index('idx_attempts_success', 'captcha_solve_attempts', ['was_successful'])


def downgrade():
    """Drop all CAPTCHA Intelligence tables"""
    op.drop_index('idx_attempts_success')
    op.drop_index('idx_attempts_type')
    op.drop_index('idx_attempts_worker')
    op.drop_index('idx_training_hash')
    
    op.drop_table('captcha_providers')
    op.drop_table('captcha_solve_attempts')
    op.drop_table('anti_detection_signatures')
    op.drop_table('captcha_training_data')
    op.drop_table('captcha_types')
