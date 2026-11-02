import type { Metadata } from 'next'
import TicketView from '@/components/TicketView'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: (await params).id }
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TicketView id={id} />
}
