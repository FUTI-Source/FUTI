import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ContactDialog() {
  const [senderEmail, setSenderEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tip, setTip] = useState('');
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTip('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderEmail, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTip('✅ 留言发送成功！');
      setSenderEmail('');
      setMessage('');
    } catch (err) {
      setTip(`❌ ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* 这里去掉 <Button>，直接用 DialogTrigger，由外层 motion.div 提供样式 */}
      <DialogTrigger className="flex items-center gap-1">
        <Icon className="size-4 fill-[#ecf6ff] stroke-[#ecf6ff]/85" />
        Email
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>发送留言</DialogTitle>
          <DialogDescription>
            留下你的邮箱和消息，我收到邮件后回复你
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <Input
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            placeholder="你的邮箱"
            required
          />
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="在这里输入留言..."
            rows={4}
            required
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '发送中...' : '提交留言'}
          </Button>
          {tip && <p className="text-sm text-center">{tip}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
