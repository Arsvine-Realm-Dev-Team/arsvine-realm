'use client';

import dynamic from 'next/dynamic';
import type { BlogPostPageProps } from './BlogPostPage';

const BlogPostPage = dynamic(() => import('./BlogPostPage'), { ssr: false });

export default function BlogPostClient(props: BlogPostPageProps) {
  return <BlogPostPage {...props} />;
}
